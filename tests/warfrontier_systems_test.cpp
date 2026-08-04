#include "../src/warfrontier_systems.h"

#include <cassert>
#include <cmath>
#include <iostream>

namespace
{
bool near(float left, float right, float epsilon = 0.001f)
{
	return std::fabs(left - right) <= epsilon;
}

void testEnergy()
{
	warfrontier::EnergyState energy{50.0f, 100.0f, 10.0f};
	assert(energy.canSpend(25.0f));
	assert(energy.spend(25.0f));
	assert(near(energy.current, 25.0f));
	assert(!energy.spend(30.0f));
	energy.recharge(2.0f);
	assert(near(energy.current, 45.0f));
	energy.recharge(100.0f);
	assert(near(energy.current, 100.0f));
}

void testHeat()
{
	warfrontier::HeatState heat{0.0f, 100.0f, 10.0f, 0.85f};
	heat.add(84.0f);
	assert(!heat.isOverheated());
	heat.add(1.0f);
	assert(heat.isOverheated());
	assert(near(heat.normalized(), 0.85f));
	heat.dissipate(2.0f);
	assert(near(heat.current, 65.0f));
	assert(!heat.isOverheated());
}

void testShield()
{
	warfrontier::ShieldState shield{100.0f, 100.0f, 20.0f, 2.0f, 10.0f, true};
	assert(shield.active());
	assert(near(shield.absorb(35.0f), 0.0f));
	assert(near(shield.current, 65.0f));
	assert(near(shield.absorb(80.0f), 15.0f));
	assert(near(shield.current, 0.0f));
	shield.update(1.0f);
	assert(near(shield.current, 0.0f));
	shield.update(1.0f);
	assert(near(shield.current, 20.0f));
}

void testBeamMaximumDuration()
{
	warfrontier::EnergyState energy{100.0f, 100.0f, 0.0f};
	warfrontier::HeatState heat{0.0f, 100.0f, 0.0f, 0.95f};
	warfrontier::BeamWeaponConfig config{20.0f, 10.0f, 5.0f, 2.0f};
	warfrontier::BeamWeaponState beam;

	assert(beam.begin(config, energy, heat));
	assert(near(beam.update(1.0f, config, energy, heat), 20.0f));
	assert(beam.firing);
	assert(near(beam.update(2.0f, config, energy, heat), 20.0f));
	assert(!beam.firing);
	assert(near(energy.current, 80.0f));
	assert(near(heat.current, 10.0f));
}

void testBeamStopsOnEnergyExhaustion()
{
	warfrontier::EnergyState energy{5.0f, 100.0f, 0.0f};
	warfrontier::HeatState heat{0.0f, 100.0f, 0.0f, 0.95f};
	warfrontier::BeamWeaponConfig config{30.0f, 10.0f, 4.0f, 5.0f};
	warfrontier::BeamWeaponState beam;

	assert(beam.begin(config, energy, heat));
	assert(near(beam.update(1.0f, config, energy, heat), 15.0f));
	assert(!beam.firing);
	assert(near(energy.current, 0.0f));
	assert(near(heat.current, 2.0f));
}

void testCombatUpdate()
{
	warfrontier::CombatSystemState state;
	state.energy = {0.0f, 100.0f, 10.0f};
	state.heat = {50.0f, 100.0f, 5.0f, 0.85f};
	state.shield = {0.0f, 100.0f, 10.0f, 0.0f, 1.0f, true};
	state.update(2.0f);
	assert(near(state.energy.current, 20.0f));
	assert(near(state.heat.current, 40.0f));
	assert(near(state.shield.current, 20.0f));
}
} // namespace

int main()
{
	testEnergy();
	testHeat();
	testShield();
	testBeamMaximumDuration();
	testBeamStopsOnEnergyExhaustion();
	testCombatUpdate();
	std::cout << "WarFrontier combat systems tests passed\n";
	return 0;
}
