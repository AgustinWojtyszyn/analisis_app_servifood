# XLSX security review - 2026-07-21

## Current production usage

`xlsx@0.18.5` remains in the frontend only.

- `frontend/src/components/CustomerNonconformitiesPage.jsx`: reads customer nonconformity workbooks selected by the user.
- `frontend/src/lib/customerNonconformities.js`: parses workbook sheets with `XLSX.read`, `XLSX.utils.decode_range`, `XLSX.utils.encode_cell` and direct cell access.

The frontend also imports backend-generated Excel files as downloads, but those flows do not require `xlsx` parsing.

## Risk

`npm audit` reports two high severity advisories for SheetJS/xlsx:

- Prototype pollution in workbook parsing.
- ReDoS in parsing logic.

The risk is bounded to user-supplied Excel parsing in the browser, but a crafted workbook could still freeze the UI or affect client-side object state while the page is open.

## Compatibility decision

There is no safe npm release for the `xlsx` package line used by this app (`npm audit` reports `fixAvailable: false`). Replacing it in this change would require reimplementing the customer nonconformity workbook parser and validating the accepted workbook formats.

## Recommended replacement

Migrate the remaining frontend parser to `exceljs`, which is already used by both frontend and backend in this repository. The migration should preserve:

- Header detection and row scanning in `customerNonconformities.js`.
- Existing accepted `.xls`/`.xlsx` behavior or an explicit product decision to reject legacy `.xls` files.
- Current tests in `frontend/src/lib/customerNonconformities.test.js`, expanded with malformed workbook cases.

