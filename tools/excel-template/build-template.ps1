param([string]$Json, [string]$Out)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw -Encoding UTF8 $Json | ConvertFrom-Json
function Rgb($a) { [int]$a[0] + [int]$a[1] * 256 + [int]$a[2] * 65536 }
function YMD([string]$s) { $p = $s.Split("-"); New-Object DateTime ([int]$p[0]), ([int]$p[1]), ([int]$p[2]) }
$FONT = 'Leelawadee UI'
$cols = @($cfg.columns)
$n = $cols.Count
$first = 7; $lastData = 500

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false; $xl.DisplayAlerts = $false; $xl.ScreenUpdating = $false
try {
  $wb = $xl.Workbooks.Add()
  while ($wb.Worksheets.Count -lt 2) { [void]$wb.Worksheets.Add([Type]::Missing, $wb.Worksheets.Item($wb.Worksheets.Count)) }
  $ws = $wb.Worksheets.Item(1); $ws.Name = 'Candidate Database'
  $ws.Cells.Font.Name = $FONT; $ws.Cells.Font.Size = 11
  $ws.Cells.VerticalAlignment = -4108  # center

  # Row 1 title, row 2 instructions, row 3 colour legend
  $ws.Cells.Item(1, 1).Value2 = $cfg.title
  $ws.Cells.Item(1, 1).Font.Size = 18; $ws.Cells.Item(1, 1).Font.Bold = $true
  $ws.Rows.Item(1).RowHeight = 34
  $r2 = $ws.Range($ws.Cells.Item(2, 1), $ws.Cells.Item(2, 13)); $r2.Merge(); $r2.WrapText = $true
  $r2.Value2 = $cfg.intro; $r2.Font.Color = Rgb @(61, 60, 56)
  $ws.Rows.Item(2).RowHeight = 36
  $c = 1
  foreach ($lg in $cfg.legend) {
    $rg = $ws.Range($ws.Cells.Item(3, $c), $ws.Cells.Item(3, $c + 2)); $rg.Merge()
    $rg.Value2 = $lg.text; $rg.Interior.Color = Rgb $lg.fill; $rg.Font.Color = Rgb $lg.font
    $rg.Font.Bold = $true; $rg.Font.Size = 10; $rg.HorizontalAlignment = -4108
    $c += 3
  }
  $ws.Rows.Item(3).RowHeight = 22

  # Row 4 column groups
  foreach ($g in $cfg.groups) {
    $rg = $ws.Range($ws.Cells.Item(4, [int]$g.from), $ws.Cells.Item(4, [int]$g.to)); $rg.Merge()
    $rg.Value2 = $g.name; $rg.Interior.Color = Rgb $g.fill; $rg.Font.Color = Rgb $g.font
    $rg.Font.Bold = $true; $rg.HorizontalAlignment = -4131
    $rg.IndentLevel = 1
  }
  $ws.Rows.Item(4).RowHeight = 24

  # Row 5 descriptions (yellow), row 6 headers, rows 7-9 examples (green)
  for ($i = 0; $i -lt $n; $i++) {
    $col = $cols[$i]; $ci = $i + 1
    $desc = if ($col.kind -eq 'score') { "$($col.dim) · ใส่ 1–5" } else { $col.desc }
    if ($col.req) { $desc = "★ ต้องกรอก · " + $desc }
    $d = $ws.Cells.Item(5, $ci); $d.Value2 = $desc
    $h = $ws.Cells.Item(6, $ci); $h.Value2 = $col.h
    $h.Interior.Color = if ($col.req) { Rgb @(91, 61, 245) } else { Rgb @(17, 17, 17) }
    $ws.Columns.Item($ci).ColumnWidth = [double]$col.w

    $data = $ws.Range($ws.Cells.Item($first, $ci), $ws.Cells.Item($lastData, $ci))
    switch ($col.kind) {
      'id'       { $data.NumberFormat = '@' }
      'text'     { $data.NumberFormat = '@' }
      'long'     { $data.NumberFormat = '@' }
      'money'    { $data.NumberFormat = '#,##0' }
      'date'     { $data.NumberFormat = 'dd/mm/yyyy' }
      'datetime' { $data.NumberFormat = 'dd/mm/yyyy hh:mm' }
    }
    # Validation: dropdowns / number checks, and every column shows its description when a cell is selected.
    $v = $data.Validation; $v.Delete()
    switch ($col.kind) {
      'rec'      { $v.Add(3, 1, 1, $cfg.rec) }
      'decision' { $v.Add(3, 1, 1, $cfg.decisions) }
      'yesno'    { $v.Add(3, 1, 1, 'Yes,No') }
      'score'    { $v.Add(1, 1, 1, '1', '5'); $v.ErrorMessage = 'ใส่ตัวเลขจำนวนเต็ม 1 ถึง 5 หรือเว้นว่าง' }
      'int'      { $v.Add(1, 1, 1, '15', '80'); $v.ErrorMessage = 'ใส่อายุเป็นตัวเลข 15 ถึง 80' }
      'num'      { $v.Add(2, 1, 1, '0', '60'); $v.ErrorMessage = 'ใส่ตัวเลข 0 ถึง 60' }
      'money'    { $v.Add(2, 1, 1, '0', '10000000'); $v.ErrorMessage = 'ใส่ตัวเลขเท่านั้น ไม่ต้องพิมพ์ , หรือ ฿' }
      'date'     { $v.Add(4, 1, 1, '=DATE(2000,1,1)', '=DATE(2100,12,31)'); $v.ErrorMessage = 'ใส่เป็นวันที่ ปี ค.ศ. เช่น 20/10/2026' }
      'datetime' { $v.Add(4, 1, 1, '=DATE(2000,1,1)', '=DATE(2100,12,31)'); $v.ErrorMessage = 'ใส่วันและเวลา ปี ค.ศ. เช่น 10/11/2026 10:00' }
      default    { $v.Add(0) }
    }
    $v.IgnoreBlank = $true
    $title = [string]$col.h; if ($title.Length -gt 32) { $title = $title.Substring(0, 32) }
    $v.InputTitle = $title
    $msg = [string]$desc; if ($msg.Length -gt 250) { $msg = $msg.Substring(0, 250) }
    $v.InputMessage = $msg; $v.ShowInput = $true
    if ($col.kind -in @('rec', 'decision', 'yesno')) { $v.ShowError = $true; $v.ErrorMessage = 'เลือกจากรายการเท่านั้น' }

    for ($e = 0; $e -lt 3; $e++) {
      $val = $col.ex[$e]
      if ($null -eq $val -or "$val" -eq '') { continue }
      $cell = $ws.Cells.Item($first + $e, $ci)
      if ($col.kind -eq 'date') { $cell.Formula = [string][int](YMD $val).ToOADate() }
      elseif ($col.kind -in @('int', 'num', 'money', 'score')) { $cell.Value2 = [double]$val }
      else { $cell.Value2 = [string]$val }
    }
  }
  $desc = $ws.Range($ws.Cells.Item(5, 1), $ws.Cells.Item(5, $n))
  $desc.Interior.Color = Rgb @(255, 241, 194); $desc.Font.Color = Rgb @(92, 67, 0); $desc.Font.Size = 9
  $desc.WrapText = $true; $desc.VerticalAlignment = -4160
  $ws.Rows.Item(5).RowHeight = 118
  $hdr = $ws.Range($ws.Cells.Item(6, 1), $ws.Cells.Item(6, $n))
  $hdr.Font.Color = Rgb @(255, 255, 255); $hdr.Font.Bold = $true; $hdr.WrapText = $true; $hdr.HorizontalAlignment = -4108
  $ws.Rows.Item(6).RowHeight = 50
  $ex = $ws.Range($ws.Cells.Item($first, 1), $ws.Cells.Item($first + 2, $n))
  $ex.Interior.Color = Rgb @(232, 251, 196); $ex.WrapText = $true; $ex.VerticalAlignment = -4160
  for ($r = $first; $r -le $first + 2; $r++) { $ws.Rows.Item($r).RowHeight = 48 }

  $grid = $ws.Range($ws.Cells.Item(5, 1), $ws.Cells.Item($first + 2, $n))
  foreach ($b in 7..12) { $grid.Borders.Item($b).LineStyle = 1; $grid.Borders.Item($b).Color = Rgb @(206, 204, 197) }

  $ws.Activate()
  $xl.ActiveWindow.DisplayGridlines = $true
  $ws.Range('C7').Select(); $xl.ActiveWindow.FreezePanes = $false
  $xl.ActiveWindow.SplitRow = 6; $xl.ActiveWindow.SplitColumn = 2; $xl.ActiveWindow.FreezePanes = $true
  $xl.ActiveWindow.Zoom = 90
  $ws.Range('A7').Select()

  # Sheet 2: how-to and column reference
  $hs = $wb.Worksheets.Item(2); $hs.Name = 'วิธีใช้'
  $hs.Cells.Font.Name = $FONT; $hs.Cells.Font.Size = 11; $hs.Cells.VerticalAlignment = -4160
  $hs.Cells.Item(1, 1).Value2 = 'วิธีใช้ Template นำเข้าผู้สมัคร'; $hs.Cells.Item(1, 1).Font.Size = 18; $hs.Cells.Item(1, 1).Font.Bold = $true
  $hs.Rows.Item(1).RowHeight = 34
  $row = 3
  foreach ($nt in $cfg.notes) {
    $hs.Cells.Item($row, 1).Value2 = $nt[0]; $hs.Cells.Item($row, 1).Font.Bold = $true
    $hs.Cells.Item($row, 1).Interior.Color = Rgb @(228, 221, 255); $hs.Cells.Item($row, 1).Font.Color = Rgb @(42, 26, 140)
    $m = $hs.Range($hs.Cells.Item($row, 2), $hs.Cells.Item($row, 5)); $m.Merge(); $m.Value2 = $nt[1]; $m.WrapText = $true
    $hs.Rows.Item($row).RowHeight = if ($nt[1].Length -gt 110) { 48 } else { 30 }
    $row++
  }
  $row++
  $heads = @('คอลัมน์', 'ต้องกรอก', 'รูปแบบ', 'คำอธิบาย', 'ตัวอย่าง (แถวแรก)')
  for ($k = 0; $k -lt 5; $k++) { $hs.Cells.Item($row, $k + 1).Value2 = $heads[$k] }
  $th = $hs.Range($hs.Cells.Item($row, 1), $hs.Cells.Item($row, 5))
  $th.Interior.Color = Rgb @(17, 17, 17); $th.Font.Color = Rgb @(255, 255, 255); $th.Font.Bold = $true
  $top = $row; $row++
  $kindText = @{ id = 'ข้อความ'; text = 'ข้อความ'; long = 'ข้อความยาว'; int = 'ตัวเลข'; num = 'ตัวเลข'; money = 'ตัวเลข (บาท)'; date = 'วันที่'; datetime = 'วันที่และเวลา'; rec = 'เลือกจากรายการ'; decision = 'เลือกจากรายการ'; yesno = 'Yes / No'; score = 'ตัวเลข 1–5' }
  foreach ($col in $cols) {
    $hs.Cells.Item($row, 1).Value2 = $col.h
    $hs.Cells.Item($row, 2).Value2 = if ($col.req) { 'ต้องกรอก' } else { '' }
    $hs.Cells.Item($row, 3).Value2 = $kindText[[string]$col.kind]
    $hs.Cells.Item($row, 4).Value2 = if ($col.kind -eq 'score') { "$($col.dim) · เว้นว่าง = ยังไม่ให้คะแนน" } else { $col.desc }
    $ex0 = $col.ex[0]
    if ($col.kind -eq 'date' -and $ex0) { $ex0 = (YMD $ex0).ToString('dd/MM/yyyy', [Globalization.CultureInfo]::InvariantCulture) }
    $hs.Cells.Item($row, 5).NumberFormat = '@'; $hs.Cells.Item($row, 5).Value2 = [string]$ex0
    if ($col.req) { $hs.Cells.Item($row, 2).Font.Color = Rgb @(201, 42, 42); $hs.Cells.Item($row, 2).Font.Bold = $true }
    $row++
  }
  $tbl = $hs.Range($hs.Cells.Item($top, 1), $hs.Cells.Item($row - 1, 5))
  $tbl.WrapText = $true
  foreach ($b in 7..12) { $tbl.Borders.Item($b).LineStyle = 1; $tbl.Borders.Item($b).Color = Rgb @(206, 204, 197) }
  $hs.Columns.Item(1).ColumnWidth = 26; $hs.Columns.Item(2).ColumnWidth = 10; $hs.Columns.Item(3).ColumnWidth = 15
  $hs.Columns.Item(4).ColumnWidth = 70; $hs.Columns.Item(5).ColumnWidth = 30
  $hs.Range($hs.Cells.Item($top + 1, 1), $hs.Cells.Item($row - 1, 5)).Rows.AutoFit() | Out-Null

  $ws.Activate()
  if (Test-Path $Out) { Remove-Item $Out -Force }
  $wb.SaveAs($Out, 51)
  $wb.Close($false)
  "saved $Out"
} finally {
  $xl.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
}
