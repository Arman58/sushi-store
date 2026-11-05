import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { escapeCsvCell, toCsvRow } from "@/lib/csv";

describe("escapeCsvCell: защита от formula injection", () => {
    it("значения, похожие на формулу, получают апостроф", () => {
        assert.equal(escapeCsvCell('=HYPERLINK("http://evil","x")'), `"'=HYPERLINK(""http://evil"",""x"")"`);
        assert.equal(escapeCsvCell("=1+1"), "'=1+1");
        assert.equal(escapeCsvCell("@SUM(1+1)"), "'@SUM(1+1)");
        assert.equal(escapeCsvCell("-cmd|' /C calc'!A0"), "'-cmd|' /C calc'!A0");
        assert.equal(escapeCsvCell("+cmd"), "'+cmd");
        assert.equal(escapeCsvCell("\t=1+1"), "'\t=1+1");
    });

    it("телефоны и числа не портятся", () => {
        assert.equal(escapeCsvCell("+37499123456"), "+37499123456");
        assert.equal(escapeCsvCell("+374 (99) 12-34-56"), "+374 (99) 12-34-56");
        assert.equal(escapeCsvCell("-5"), "-5");
        assert.equal(escapeCsvCell(4500), "4500");
    });

    it("обычный текст не меняется, формула в середине безопасна", () => {
        assert.equal(escapeCsvCell("Anna"), "Anna");
        assert.equal(escapeCsvCell("Вазген = друг"), "Вазген = друг");
        assert.equal(escapeCsvCell("a=1"), "a=1");
    });

    it("пустые значения", () => {
        assert.equal(escapeCsvCell(null), "");
        assert.equal(escapeCsvCell(undefined), "");
        assert.equal(escapeCsvCell(""), "");
    });
});

describe("escapeCsvCell: RFC 4180", () => {
    it("оборачивает значения с запятой, кавычкой и переводом строки", () => {
        assert.equal(escapeCsvCell("a,b"), '"a,b"');
        assert.equal(escapeCsvCell('say "hi"'), '"say ""hi"""');
        assert.equal(escapeCsvCell("line1\nline2"), '"line1\nline2"');
        assert.equal(escapeCsvCell("line1\r\nline2"), '"line1\r\nline2"');
    });
});

describe("toCsvRow", () => {
    it("собирает строку из ячеек", () => {
        assert.equal(toCsvRow([1, "=x", "a,b", null]), `1,'=x,"a,b",`);
    });
});
