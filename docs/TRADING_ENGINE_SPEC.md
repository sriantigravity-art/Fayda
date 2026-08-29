# Quantitative Trading Engine & Mathematical Specifications

This document outlines the quantitative algorithms, Black-Scholes implementations, Implied Volatility root-finding algorithms, multi-factor scoring equations, and trade guidance models utilized in the **Live Options OI Surge Radar**.

---

## 1. Black-Scholes Model & Numerical Root-Finding

### 1.1 Analytical Equations
For an underlying asset with spot price $S$, strike price $K$, risk-free rate $r = 0.068$ (6.8%), volatility $\sigma$, and time to expiry $T$ in years:

$$d_1 = \frac{\ln(S / K) + (r + \frac{1}{2}\sigma^2)T}{\sigma \sqrt{T}}$$

$$d_2 = d_1 - \sigma \sqrt{T}$$

**Theoretical Call Price ($C_{BS}$):**
$$C_{BS} = S \cdot N(d_1) - K e^{-rT} N(d_2)$$

**Theoretical Put Price ($P_{BS}$):**
$$P_{BS} = K e^{-rT} N(-d_2) - S \cdot N(-d_1)$$

Where $N(x)$ is the cumulative standard normal distribution function approximated as:

$$N(x) = 1 - \frac{1}{\sqrt{2\pi}} e^{-x^2/2} \left(a_1 t + a_2 t^2 + a_3 t^3 + a_4 t^4 + a_5 t^5\right)$$
$$\text{with } t = \frac{1}{1 + p x}$$

Constants:
- $p = 0.3275911$
- $a_1 = 0.254829592$
- $a_2 = -0.284496736$
- $a_3 = 1.421413741$
- $a_4 = -1.453152027$
- $a_5 = 1.061405429$

---

### 1.2 Numerical Inversion for Implied Volatility (IV)

To obtain Implied Volatility $\sigma_{IV}$, we find the root of the objective function:

$$f(\sigma) = \text{BS\_Price}(S, K, T, r, \sigma) - LTP_{market} = 0$$

#### Bisection Algorithm Implementation:
1. Initialize search boundaries $\sigma_{low} = 0.03$ (3%) and $\sigma_{high} = 1.50$ (150%).
2. At iteration $i$:
   $$\sigma_{mid} = \frac{\sigma_{low} + \sigma_{high}}{2}$$
   $$f(\sigma_{mid}) = \text{BS\_Price}(S, K, T, r, \sigma_{mid}) - LTP_{market}$$
3. If $|f(\sigma_{mid})| < 0.05$ or $i \ge 22$, terminate and return $\sigma_{IV} = \sigma_{mid} \times 100\%$.
4. If $f(\sigma_{mid}) > 0$, set $\sigma_{high} = \sigma_{mid}$; else set $\sigma_{low} = \sigma_{mid}$.

---

### 1.3 Black-Scholes Theta Decay Formulation

The analytical derivative of option price with respect to time $t$ ($\frac{\partial V}{\partial t}$):

**Call Daily Theta ($\Theta_{Call}$):**
$$\Theta_{Call} = \frac{1}{365} \left[ -\frac{S \cdot N'(d_1) \cdot \sigma}{2\sqrt{T}} - r \cdot K e^{-rT} N(d_2) \right]$$

**Put Daily Theta ($\Theta_{Put}$):**
$$\Theta_{Put} = \frac{1}{365} \left[ -\frac{S \cdot N'(d_1) \cdot \sigma}{2\sqrt{T}} + r \cdot K e^{-rT} N(-d_2) \right]$$

Where:
$$N'(x) = \frac{1}{\sqrt{2\pi}} e^{-\frac{x^2}{2}}$$

**Hourly Theta Decay ($\Theta_{Hour}$):**
$$\Theta_{Hour} = \frac{\Theta_{Daily}}{6.4}$$
*(Reflecting the 6 hours 24 minutes of Indian stock exchange trading sessions).*

---

## 2. Multi-Factor OI Surge Scoring Model

The surge score $S_{total} \in [0, 100]$ evaluates whether unusual option activity represents true institutional momentum:

$$S_{total} = \text{clamp}\left(0, 100, \sum_{k=1}^5 w_k \cdot f_k\right)$$

### Factor Breakdown:

1. **OI Velocity ($w_1 = 0.40$):**
   $$\text{Multiple}_{OI} = \frac{|\Delta OI_{1m}|}{\max(10000, \overline{\Delta OI}_{baseline})}$$
   $$f_1 = \min\left(100, \text{Multiple}_{OI} \times 15\right)$$
   *(If $|\Delta OI| > 400,000$ contracts in Nifty, $f_1 = 100$ immediately).*

2. **Relative Volume ($w_2 = 0.20$):**
   $$\text{Multiple}_{Vol} = \frac{\text{Volume}_{current}}{\max(50000, \overline{\text{Vol}}_{baseline})}$$
   $$f_2 = \min\left(100, \text{Multiple}_{Vol} \times 25\right)$$

3. **Premium Velocity ($w_3 = 0.20$):**
   $$f_3 = \min\left(100, |\Delta \% LTP_{1m}| \times 6.5\right)$$

4. **PCR Velocity ($w_4 = 0.10$):**
   $$f_4 = \min\left(100, |\Delta PCR_{1m}| \times 500\right)$$

5. **ATM Proximity ($w_5 = 0.10$):**
   $$\text{Distance} = \frac{|K - K_{ATM}|}{\text{Step}}$$
   $$f_5 = \max\left(5, 100 - (\text{Distance} \times 15)\right)$$

### Surge Classifications:
- **EXTREME**: $S_{total} \ge 80$ or $\text{Multiple}_{OI} \ge 5.0\times$
- **STRONG**: $S_{total} \ge 60$ or $\text{Multiple}_{OI} \ge 3.0\times$
- **MODERATE**: $S_{total} \ge 35$ or $\text{Multiple}_{OI} \ge 1.8\times$

---

## 3. Institutional Buildup Classification Matrix

$$\begin{array}{|c|c|c|l|}
\hline
\mathbf{\Delta OI} & \mathbf{\Delta LTP} & \textbf{Classification} & \textbf{Institutional Interpretation} \\
\hline
> 0 & > 0 & \text{LONG BUILDUP} & \text{Aggressive buying pressure; breakout accumulation} \\
> 0 & < 0 & \text{SHORT BUILDUP} & \text{Institutional writing / strong resistance creation} \\
< 0 & > 0 & \text{SHORT COVERING} & \text{Trapped writers fleeing; violent upward squeeze} \\
< 0 & < 0 & \text{LONG UNWINDING} & \text{Buyers liquidating positions; momentum exhaustion} \\
\hline
\end{array}$$

---

## 4. Adaptive Target & Risk-Reward Engine

### 4.1 Dynamic Percentage Formulas:
$$\text{Target } \% = \text{clamp}\left(8\%, 32\%, 28\% \times M_{session} \times M_{moneyness}\right)$$
$$\text{Stoploss } \% = \text{clamp}\left(5\%, 16\%, \text{Target } \% \times 0.55\right)$$

### 4.2 Time-of-Day Volatility Multiplier ($M_{session}$):
- **09:15 - 10:30 IST**: $M_{session} = 1.00$ (High opening range momentum)
- **10:30 - 13:00 IST**: $M_{session} = 0.70$ (Midday mean-reversion consolidation)
- **13:00 - 14:30 IST**: $M_{session} = 0.75$ (Afternoon trend continuation)
- **14:30 - 15:30 IST**: $M_{session} = 0.55$ (Closing theta risk reduction)

### 4.3 Moneyness Multiplier ($M_{moneyness}$):
- $\text{Distance} \le 150 \text{ pts}$: $M_{moneyness} = 1.00$
- $150 < \text{Distance} \le 300 \text{ pts}$: $M_{moneyness} = 0.80$
- $\text{Distance} > 300 \text{ pts}$: $M_{moneyness} = 0.65$

---

## 5. Put-Call Ratio (PCR) & Max Pain Theory

### 5.1 Multi-Tier PCR Formulas:
$$\text{Total PCR} = \frac{\sum_{i} \text{Put OI}_i}{\sum_{i} \text{Call OI}_i}$$

$$\text{ATM PCR} = \frac{\text{Put OI at } K_{ATM}}{\text{Call OI at } K_{ATM}}$$

$$\text{ATM}\pm 5\text{ PCR} = \frac{\sum_{i=-5}^{+5} \text{Put OI}_{ATM+i}}{\sum_{i=-5}^{+5} \text{Call OI}_{ATM+i}}$$

### 5.2 Max Pain Strike:
$$\text{Loss}(K) = \sum_{j} \text{CallOI}_j \cdot \max(0, K - K_j) + \sum_{j} \text{PutOI}_j \cdot \max(0, K_j - K)$$

$$\text{Max Pain} = \arg\min_{K} \text{Loss}(K)$$
