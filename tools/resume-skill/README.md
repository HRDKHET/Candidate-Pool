# Resume Skill (Candidate Pool Profile)

`SKILL.md` is the original "create-candidate-pool-profile" Skill that defines how Claude reads a
resume and returns a candidate profile as JSON (fields, 7-dimension scoring, comments).

The web app does not read this file. Its text is copied into `js/resume-prompt.js`, which is what
HRS copies into claude.ai on the "นำเข้า Resume" page. Two parts are filled in there instead of
being fixed: the positions that exist in the system and today's date.

If the Skill changes, update `js/resume-prompt.js` to match.
