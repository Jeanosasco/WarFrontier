#include "warfrontier_systems.h"

#include <cmath>

namespace warfrontier
{
namespace
{
constexpr float kEpsilon = 0.0001f;

[[nodiscard]] float nonNegative(float value) noexcept
{
	return std::max(0.0f, value);
}

[[nodiscard]] float safeDelta(float deltaSeconds) noexcept
{
	return std::isfinite(deltaSeconds) ? nonNegative(deltaSeconds) : 0.0f;
}
} // namespace

bool EnergyState::canSpend(float amount) const noexcept
{
	if (!std::isfinite(amount) || amount < 0.0f)
	{
		return false;
	}

	return current + kEpsilon >= amount;
}

bool EnergyState::spend(float amount) noexcept
{
	if (!canSpend(amount))
	{
		return false;
	}

	current = std::clamp(current - amount, 0.0f, nonNegative(capacity));
	return true;
}

void EnergyState::recharge(float deltaSeconds) noexcept
{
	const float safeCapacity = nonNegative(capacity);
	const float gain = nonNegative(rechargePerSecond) * safeDelta(deltaSeconds);
	current = std::clamp(current + gain, 0.0f, safeCapacity);
}

bool HeatState::isOverheated() const noexcept
{
	if (capacity <= kEpsilon)
	{
		return current > 0.0f;
	}

	const float threshold = std::clamp(overheatThreshold, 0.0f, 1.0f);
	return normalized() + kEpsilon >= threshold;
}

float HeatState::normalized() const noexcept
{
	if (capacity <= kEpsilon)
	{
		return current > 0.0f ? 1.0f : 0.0f;
	}

	return std::clamp(current / capacity, 0.0f, 1.0f);
}

void HeatState::add(float amount) noexcept
{
	if (!std::isfinite(amount) || amount <= 0.0f)
	{
		return;
	}

	current = std::clamp(current + amount, 0.0f, nonNegative(capacity));
}

void HeatState::dissipate(float deltaSeconds, float environmentalMultiplier) noexcept
{
	const float multiplier = std::isfinite(environmentalMultiplier)
		? nonNegative(environmentalMultiplier)
		: 0.0f;
	const float loss = nonNegative(dissipationPerSecond) * multiplier * safeDelta(deltaSeconds);
	current = std::clamp(current - loss, 0.0f, nonNegative(capacity));
}

bool ShieldState::active() const noexcept
{
	return enabled && capacity > kEpsilon && current > kEpsilon;
}

float ShieldState::absorb(float incomingDamage) noexcept
{
	if (!std::isfinite(incomingDamage) || incomingDamage <= 0.0f)
	{
		return 0.0f;
	}

	timeSinceLastDamage = 0.0f;
	if (!active())
	{
		return incomingDamage;
	}

	const float absorbed = std::min(current, incomingDamage);
	current = std::max(0.0f, current - absorbed);
	return incomingDamage - absorbed;
}

void ShieldState::update(float deltaSeconds) noexcept
{
	const float delta = safeDelta(deltaSeconds);
	timeSinceLastDamage = std::max(0.0f, timeSinceLastDamage + delta);

	if (!enabled || timeSinceLastDamage + kEpsilon < nonNegative(rechargeDelaySeconds))
	{
		return;
	}

	const float safeCapacity = nonNegative(capacity);
	const float gain = nonNegative(rechargePerSecond) * delta;
	current = std::clamp(current + gain, 0.0f, safeCapacity);
}

bool BeamWeaponState::begin(
	const BeamWeaponConfig &config,
	const EnergyState &energy,
	const HeatState &heat) noexcept
{
	if (firing || heat.isOverheated())
	{
		return false;
	}

	if (config.maximumDurationSeconds <= 0.0f || config.damagePerSecond <= 0.0f)
	{
		return false;
	}

	if (!energy.canSpend(nonNegative(config.energyPerSecond) * kEpsilon))
	{
		return false;
	}

	activeTimeSeconds = 0.0f;
	firing = true;
	return true;
}

float BeamWeaponState::update(
	float deltaSeconds,
	const BeamWeaponConfig &config,
	EnergyState &energy,
	HeatState &heat) noexcept
{
	if (!firing)
	{
		return 0.0f;
	}

	const float requestedDelta = safeDelta(deltaSeconds);
	const float remainingDuration = std::max(0.0f, config.maximumDurationSeconds - activeTimeSeconds);
	const float usableDelta = std::min(requestedDelta, remainingDuration);

	if (usableDelta <= kEpsilon || heat.isOverheated())
	{
		stop();
		return 0.0f;
	}

	const float energyPerSecond = nonNegative(config.energyPerSecond);
	float actualDelta = usableDelta;

	if (energyPerSecond > kEpsilon)
	{
		actualDelta = std::min(actualDelta, energy.current / energyPerSecond);
	}

	if (actualDelta <= kEpsilon)
	{
		stop();
		return 0.0f;
	}

	const float energyCost = energyPerSecond * actualDelta;
	if (!energy.spend(energyCost))
	{
		stop();
		return 0.0f;
	}

	heat.add(nonNegative(config.heatPerSecond) * actualDelta);
	activeTimeSeconds += actualDelta;

	const float damage = nonNegative(config.damagePerSecond) * actualDelta;
	if (activeTimeSeconds + kEpsilon >= config.maximumDurationSeconds ||
		heat.isOverheated() ||
		actualDelta + kEpsilon < requestedDelta)
	{
		stop();
	}

	return damage;
}

void BeamWeaponState::stop() noexcept
{
	firing = false;
	activeTimeSeconds = 0.0f;
}

void CombatSystemState::update(float deltaSeconds) noexcept
{
	const float delta = safeDelta(deltaSeconds);
	energy.recharge(delta);
	heat.dissipate(delta);
	shield.update(delta);
}

} // namespace warfrontier
