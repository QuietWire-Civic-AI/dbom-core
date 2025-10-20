# Interop: SPDX → DBoM

- SPDX `PackageVerificationCode` → `artifact.digest`
- SPDX `externalRefs` (purl, cpe) → `artifact.id`
- Relationships (`CONTAINS`, `DEPENDS_ON`) → claims with `predicate` = "contains"/"depends_on"
- Licenses map to claims (`predicate`="declared_license")
- Use events for rename/version transitions across SPDX documents.

Future: formal mappers + examples.
