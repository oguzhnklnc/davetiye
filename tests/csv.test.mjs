import assert from "node:assert/strict";
import test from "node:test";
import { csvCell } from "../app/csv.mjs";

test("CSV hücreleri formül çalıştırmayacak biçimde etkisizleştirilir", () => {
  for (const value of ["=HYPERLINK(\"https://example.test\")", "+SUM(1,2)", " -2+3", "@IMPORTXML(A1)", "\t=cmd"])
    assert.equal(csvCell(value).startsWith("\"'"), true, value);
});

test("normal değerler korunur; tırnak ve NUL güvenli işlenir", () => {
  assert.equal(csvCell("Özdil & Hüseyin"), '"Özdil & Hüseyin"');
  assert.equal(csvCell('Merhaba "dünya"'), '"Merhaba ""dünya"""');
  assert.equal(csvCell("a\0b"), '"ab"');
  assert.equal(csvCell(2), '"2"');
});
