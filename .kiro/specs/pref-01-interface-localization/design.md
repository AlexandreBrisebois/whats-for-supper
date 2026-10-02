# Interface Localization — Design

`LocaleProvider` resolves selected-member preference/local persisted fallback and locale dictionaries; `LanguageSelection` writes the preference and `LanguageSwitchProposal` handles mismatch. Components call `t`/`tWithVars`. `locale-integrity.test.ts`, LanguageSelection tests, and proposal tests are evidence. This packet owns interface lookup only, not recipe translation, source processing, or member identity transport.
