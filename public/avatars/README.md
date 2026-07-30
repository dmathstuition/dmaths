# Character-mascot avatars

Upload the five mascot PNGs here, using these **exact** filenames — the app
points at them directly (`lib/avatars.ts`):

| Filename | Image |
| --- | --- |
| `student-wave.png` | Boy waving, blue hoodie |
| `student-laptop.png` | Boy at a laptop, thumbs up |
| `student-book.png` | Boy reading a maths book |
| `student-girl.png` | Girl waving, purple hoodie |
| `admin.png` | Suited man (admin) |

Notes:
- Learners are shown a stable, "random" mascot from the four `student-*` files
  (chosen by their id, so it never changes). Admins get `admin.png`.
- Square, transparent-background PNGs work best. They're cropped to a circle
  (face-up) in small avatars and shown full-size in the dashboard/login heroes.
- If a file is missing, the app falls back to an initials avatar / SVG, so
  nothing breaks — just upload the files and they appear automatically.
