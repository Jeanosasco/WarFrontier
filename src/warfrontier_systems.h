#pragma once

#include <algorithm>
#include <cstdint>

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
	float capacity