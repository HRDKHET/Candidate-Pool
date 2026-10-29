# Excel import template

`templates/candidate-import-template.xlsx` is generated from `template.json` (columns, descriptions,
3 example candidates) by `build-template.ps1`, which drives Microsoft Excel on Windows.

Rebuild after changing the import columns in `js/excel.js`:

```powershell
.\tools\excel-template\build-template.ps1 -Json .\tools\excel-template\template.json -Out "$PWD\templates\candidate-import-template.xlsx"
```

Header text in row 6 must match the `HEADERS` map in `js/excel.js`; rows above it are ignored on import.
