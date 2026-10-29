# web

Code shared by the two websites, [nepdate.com](../site) and [patro.nepdate.com](../patro)
(ADR-0006): the light and dark switch. It sits outside both projects because a component under
`site/` is compiled with `site/tsconfig.json`, which needs `site/`'s own packages; here it needs
none, so each site builds with only its own dependencies installed.

Styles, fonts and drawings are plain files and stay in `site/`, which `patro/` reads by path.
