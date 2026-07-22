# SAMARG v2 Rating Normalization & Chemistry Methodology

This document outlines the formulas and guidelines used to compute the composite gameplay ratings, hidden behavior attributes, and dynamic partnership chemistry modifiers.

---

## 1. Composite Ratings (`BAT` & `BOWL`)

During the draft, players are shown composite ratings rather than their full attribute sets.

### A. Composite Batting Rating (`batRating`)
The composite batting rating represents overall batting capability on a scale of `10-99`:
$$batRating = 0.5 \times \text{battingAverageRating} + 0.5 \times \text{strikeRateRating}$$
Where:
- **T20 Format**:
  $$\text{battingAverageRating} = \text{clip}\left(\frac{\text{Average} - 10}{35} \times 100, 10, 99\right)$$
  $$\text{strikeRateRating} = \text{clip}\left(\frac{SR - 90}{70} \times 100, 10, 99\right)$$
- **ODI Format**:
  $$\text{battingAverageRating} = \text{clip}\left(\frac{\text{Average} - 10}{40} \times 100, 10, 99\right)$$
  $$\text{strikeRateRating} = \text{clip}\left(\frac{SR - 55}{45} \times 100, 10, 99\right)$$

*For players designated primarily as bowlers, `batRating` is capped at `55`.*

### B. Composite Bowling Rating (`bowlRating`)
For bowlers, the composite rating combines containment (economy) and wicket-taking ability:
$$bowlRating = 0.4 \times \text{economyRating} + 0.6 \times \text{wicketTakingRating}$$
Where:
- **T20 Format**:
  $$\text{economyRating} = \text{clip}\left(\frac{10.0 - \text{Econ}}{4.5} \times 100, 10, 99\right)$$
  $$\text{wicketTakingRating} = \text{clip}\left(\frac{32 - SR_{bowl}}{18} \times 100, 10, 99\right)$$
- **ODI Format**:
  $$\text{economyRating} = \text{clip}\left(\frac{7.0 - \text{Econ}}{3.5} \times 100, 10, 99\right)$$
  $$\text{wicketTakingRating} = \text{clip}\left(\frac{45 - SR_{bowl}}{25} \times 100, 10, 99\right)$$

*For pure batsmen with no bowling record, `bowlRating` is `0`.*

---

## 2. Hidden Behaviour Attributes

These attributes are derived during database generation and are used in match simulation, but are **hidden** during the draft.

### A. Batting Temperament Type
Categorized by playing style:
- **`Anchor`**: $\text{battingAverage} > 38$ and moderate strike rate (T20 $SR < 132$, ODI $SR < 80$). Steady accumulator.
- **`Aggressor`**: $\text{strikeRate} > 140$ (T20) or $SR > 92$ (ODI) and average $> 26$. Boundary hitter.
- **`Finisher`**: Typical batting position is 5–7 and high `powerHittingRating`. Specialized death-overs batter.
- **`Situational`**: Default temperament. Adapts to run rate requirements.

### B. Bowling Temperament Type
- **`New-Ball Specialist`**: High `powerplayBowlingRating`. Excellent swing/control in the Powerplay.
- **`Death Specialist`**: High `deathBowlingRating`. Bowls yorkers and slow balls in death overs.
- **`Strike Bowler`**: High `wicketTakingRating`. Sacrifices economy to break partnerships.
- **`Containment`**: Low `economyRate` and moderate wicket-taking. Focuses on dots.

### C. Composure Tag
- **`Calm-under-pressure`**: `temperamentConsistency` $> 72$ or marked as a Captain. Resists wickets cascades.
- **`Volatile`**: `temperamentConsistency` $< 45$. Prone to early dismissals if a wicket fell recently (volatility cascade).

---

## 3. Squad & Partnership Chemistry Multipliers

Chemistry impacts the run-rate flow and wicket probabilities dynamically during match simulation.

- ** teampair Chemistry Link**: Two players from the same nation and era get a $+3\%$ runs boost and a $-2\%$ wicket risk when batting together.
- **Anchor + Aggressor Partnership**: Complementary styles. Adds $+5\%$ partnership runs flow and $-3\%$ wicket risk.
- **Aggressor + Aggressor Partnership**: High volatility. Adds $+12\%$ boundary scoring rate but increases wicket risk by $+10\%$.
- **Calm Captain Composure**: A captain with `Calm-under-pressure` reduces the team's volatility modifier by $15\%$, stabilizing the tailenders.
