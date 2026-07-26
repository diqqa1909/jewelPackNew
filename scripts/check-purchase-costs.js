const assert = require("node:assert/strict");

function lineCost({ purchaseType, goldWeight, goldRatePer8g, wastageYN, wastageMg, labourCharges }) {
  const goldCost = (goldWeight / 8) * goldRatePer8g;
  const wastageWeight = purchaseType === "Gold" ? wastageMg / 1000 : wastageMg;
  const wastageCost = wastageYN === "Y" ? (wastageWeight / 8) * goldRatePer8g : 0;
  return {
    goldCost,
    wastageCost,
    labourCharges,
    totalCost: goldCost + wastageCost + labourCharges
  };
}

const goldRatePer8g = 160000;
const rows = [
  { purchaseType: "Gold", goldWeight: 16, goldRatePer8g, wastageYN: "Y", wastageMg: 500, labourCharges: 1200 },
  { purchaseType: "Gold", goldWeight: 8, goldRatePer8g, wastageYN: "N", wastageMg: 0, labourCharges: 700 }
].map(lineCost);

assert.equal(rows[0].goldCost, 320000);
assert.equal(rows[0].wastageCost, 10000);
assert.equal(rows[0].totalCost, 331200);
assert.equal(rows[1].goldCost, 160000);
assert.equal(rows[1].wastageCost, 0);
assert.equal(rows[1].totalCost, 160700);

const groupTotalCost = rows.reduce((sum, row) => sum + row.totalCost, 0);
const breakdownTotal = rows.reduce(
  (sum, row) => sum + row.goldCost + row.wastageCost + row.labourCharges,
  0
);

assert.equal(groupTotalCost, 491900);
assert.equal(breakdownTotal, groupTotalCost);
console.log("Purchase cost check passed:", groupTotalCost.toFixed(2));
