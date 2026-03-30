# Engagement Financial Calculation Formulas

This document outlines the formulas used to calculate **Gross Profit** and **Gross Margin** within the Expert Searching App, specifically handling currency normalization and discounts.

## 1. Currency Normalization

All financial calculations are performed in a base currency (default is **USD**). Before any comparison or calculation, amounts are normalized using fixed exchange rates.

### **Normalization Formula**
For any given amount in a specific currency:
$$Amount_{USD} = Amount_{original} \times ExchangeRate(Currency)$$
$$Amount_{Base} = \frac{Amount_{USD}}{ExchangeRate(BaseCurrency)}$$

*Note: In our current implementation, $BaseCurrency$ is always USD, so $ExchangeRate(BaseCurrency) = 1.0$.*

---

## 2. Gross Profit Calculation

Gross Profit is the difference between the **Effective Client Amount** and the **Expert Payout Amount**, both normalized to the base currency (USD).

### **Step 1: Calculate Effective Client Rate**
If a discount is offered, the client rate is reduced accordingly:
$$Rate_{Effective} = Rate_{Client} \times \left( \frac{100 - Discount\%}{100} \right)$$

### **Step 2: Normalize Rates**
Both the effective client rate and the expert rate are converted to USD:
$$ClientUSD = Normalize(Rate_{Effective}, ClientCurrency)$$
$$ExpertUSD = Normalize(Rate_{Expert}, ExpertCurrency)$$

### **Step 3: Final Gross Profit**
$$GrossProfit = ClientUSD - ExpertUSD$$

---

## 3. Gross Margin Percentage

Gross Margin represents the percentage of total revenue that the company retains after expert payout.

### **Formula**
$$GrossMargin\% = \left( \frac{GrossProfit}{ClientUSD} \right) \times 100$$

---

## 4. Example Exchange Rates (Static)
The system currently uses the following static exchange rates for normalization:

| Currency | Rate (to USD) |
|----------|---------------|
| USD      | 1.0           |
| EUR      | 1.09          |
| GBP      | 1.27          |
| INR      | 0.012         |
| SGD      | 0.74          |
| AED      | 0.27          |

---

## 5. Calculation Examples

### **Example 1: Client in EUR, Expert in USD (with Discount)**
**Scenario:**
- Client Rate: **€500**
- Client Currency: **EUR** (Rate: 1.09)
- Expert Rate: **$250**
- Expert Currency: **USD** (Rate: 1.0)
- Discount: **10%**

**Steps:**
1. **Apply Discount to Client Rate:**
   $$€500 \times (1 - 0.10) = €450$$
2. **Normalize Client Rate to USD:**
   $$€450 \times 1.09 = \$490.50$$
3. **Normalize Expert Rate to USD:**
   $$\$250 \times 1.0 = \$250.00$$
4. **Calculate Gross Profit:**
   $$\$490.50 - \$250.00 = \$240.50$$
5. **Calculate Gross Margin %:**
   $$(\$240.50 / \$490.50) \times 100 = \mathbf{49.03\%}$$

---

### **Example 2: Client in USD, Expert in GBP**
**Scenario:**
- Client Rate: **$800**
- Client Currency: **USD** (Rate: 1.0)
- Expert Rate: **£300**
- Expert Currency: **GBP** (Rate: 1.27)
- Discount: **0%**

**Steps:**
1. **Normalize Client Rate to USD:**
   $$\$800 \times 1.0 = \$800.00$$
2. **Normalize Expert Rate to USD:**
   $$£300 \times 1.27 = \$381.00$$
3. **Calculate Gross Profit:**
   $$\$800.00 - \$381.00 = \$419.00$$
4. **Calculate Gross Margin %:**
   $$(\$419.00 / \$800.00) \times 100 = \mathbf{52.38\%}$$

---

### **Example 3: Client in SGD, Expert in INR**
**Scenario:**
- Client Rate: **S$1,200**
- Client Currency: **SGD** (Rate: 0.74)
- Expert Rate: **₹15,000**
- Expert Currency: **INR** (Rate: 0.012)
- Discount: **5%**

**Steps:**
1. **Apply Discount to Client Rate:**
   $$S\$1,200 \times (1 - 0.05) = S\$1,140$$
2. **Normalize Client Rate to USD:**
   $$S\$1,140 \times 0.74 = \$843.60$$
3. **Normalize Expert Rate to USD:**
   $$₹15,000 \times 0.012 = \$180.00$$
4. **Calculate Gross Profit:**
   $$\$843.60 - \$180.00 = \$663.60$$
5. **Calculate Gross Margin %:**
   $$(\$663.60 / \$843.60) \times 100 = \mathbf{78.66\%}$$

---

## Code Reference
The implementation of these formulas can be found in:
- `_normalize_amount` in [engagements.py](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/engagements.py)
- `compute_profit_and_margin` in [engagements.py](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/engagements.py)
