import assert from "node:assert/strict";
import test from "node:test";
import { arePotentialDuplicateNames, findPotentialDuplicatePairs } from "../app/duplicate-rsvps.mjs";

test("aynı ve küçük yazım farkı olan adlar olası mükerrer sayılır", () => {
  assert.equal(arePotentialDuplicateNames("Oğuzhan Kılınç", "  oğuzhan   kilinc "), true);
  assert.equal(arePotentialDuplicateNames("Özcan Selver", "Özcan Selvr"), true);
  assert.equal(arePotentialDuplicateNames("Ayşe Kaya", "Mehmet Demir"), false);
  assert.equal(arePotentialDuplicateNames("Ali", "Veli"), false);
});

test("olası mükerrer eşleşmeler kayıt kimlikleriyle döner", () => {
  const records = [{ id: "1", name: "Dilek Selver" }, { id: "2", name: "Dilek Selvr" }, { id: "3", name: "Hüseyin Kılınç" }];
  assert.deepEqual(findPotentialDuplicatePairs(records).map((pair) => pair.map((item) => item.id)), [["1", "2"]]);
});
