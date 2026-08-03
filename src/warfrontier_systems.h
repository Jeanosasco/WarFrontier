#pragma once

#include <algorithm>

namespace warfrontier
{

struct EnergyState
{
	float current = 0.0f;
	float capacity = 0.0f;
	float rechargePerSecond = 0.0f;

	[[nodiscard]] bool canSpend(float amount) const noexcept;
	bool spend(float amount) noexcept;
	void recharge(float deltaSeconds) noexcept;
};

struct HeatState
{
	float current = 0.0f;
	float capacity = 100.0f;
	float dissipationPerSecond = 0.0f;
	float overheatThreshold = 0.85f;

	[[nodiscard]] bool isOverheated() const noexcept;
	[[nodiscard]] float normalized() const noexcept;
	void add(float amount) noexcept;
	void dissipate(float deltaSeconds, float environmentalMultiplier = 1.0f) noexcept;
};

struct ShieldState
{
	float current = 0.0f;
	float capacity = 0.0f;
	float rechargePerSecond = 0.0f;
	float rechargeDelaySeconds = 0.0f;
	float timeSinceLastDamage = 0.0f;
	bool enabled = true;

	[[nodiscard]] bool active() const noexcept;
	float absorb(float incomingDamage) noexcept;
	void update(float deltaSeconds) noexcept;
};

struct BeamWeaponConfig
{
	float damagePerSecond = 0.0f;
	float energyPerSecond = 0.0f;
	float heatPerSecond = 0.0f;
	float maximumDurationSeconds = 0.0f;
};

struct BeamWeaponState
{
	float activeTimeSeconds = 0.0f;
	bool firing = false;

	bool begin(const BeamWeaponConfig &config, const EnergyState &energy, const HeatState &heat) noexcept;
	float update(float deltaSeconds, const BeamWeaponConfig &config, EnergyState &energy, HeatState &heat) noexcept;
	void stop() noexcept;
};

struct CombatSystemState
{
	EnergyState energy;
	HeatState heat;
	ShieldState shield;
	BeamWeaponState beam;

	void update(float deltaSeconds) noexcept;
};

} // namespace warfrontier
