# Spec Delta

## Purpose

Expose install-facing identity and household entry points, and describe conditional share handoff into existing capture journeys without certifying device installation or delivery.

## ADDED Requirements

### Requirement: Publish ordinary household install identity

For the ordinary stable non-demo application, GET `/manifest.json` SHALL return a public manifest with ID `/`, name and short name `What's for Supper?`, start URL `/`, standalone display and portrait orientation. The response SHALL use `application/manifest+json` and `Cache-Control: no-store, max-age=0`.

#### Scenario: Read metadata before household entry
- **WHEN** a visitor without household access requests `/manifest.json` for the ordinary stable non-demo application
- **THEN** the application returns that install identity without requiring household or member selection

#### Scenario: Request launch presentation metadata
- **WHEN** the ordinary application manifest is read
- **THEN** it requests standalone portrait presentation, cream background `#FDFCF0` and theme color `#CD5D45`
- **AND** this metadata does not establish that a browser installed or honored that presentation

### Requirement: Advertise ordinary install icons

The ordinary stable non-demo manifest SHALL advertise PNG icons at 32, 180, 192 and 512 pixels, including separate maskable 192 and 512 pixel icons. The document metadata SHALL identify the 32 pixel favicon and 180 pixel Apple touch icon from the same ordinary icon set.

#### Scenario: Manifest icon descriptors
- **WHEN** the ordinary manifest is requested
- **THEN** its icons identify `/favicon-32x32.png`, `/apple-touch-icon.png`, `/android-chrome-192x192.png`, `/android-chrome-512x512.png`, `/maskable-icon-192x192.png` and `/maskable-icon-512x512.png`
- **AND** Android icons declare any purpose and maskable icons declare maskable purpose

#### Scenario: Document icon discovery
- **WHEN** initial ordinary document metadata is generated
- **THEN** its favicon is `/favicon-32x32.png` and Apple touch icon is `/apple-touch-icon.png`

### Requirement: Supply document install presentation hints

The application SHALL supply its name as document title and Apple web-app title, link `/manifest.json`, request Apple web-app capability with black-translucent status bar style, and provide device-specific portrait startup-image links. These declarations SHALL NOT certify browser or OS support.

#### Scenario: Discover metadata in initial document
- **WHEN** the ordinary Welcome document is requested
- **THEN** its initial head contains the application title, manifest link and Apple web-app metadata without requiring backend API success

#### Scenario: Declare startup images
- **WHEN** the root document is rendered
- **THEN** it includes portrait Apple startup-image links selected by device dimensions and pixel ratio
- **AND** their presence does not certify an OS splash-screen result

### Requirement: Advertise direct household shortcuts

The manifest SHALL advertise Quick Find at `/discovery` and Capture Meal at `/capture`, each with a 192 pixel icon. Opening these destinations SHALL remain subject to household-identity requirements `Gate protected page entry with household access` and `Apply member context after household access`.

#### Scenario: Read shortcut destinations
- **WHEN** the ordinary manifest is requested
- **THEN** it advertises Quick Find with short name Find and Capture Meal with short name Capture at those destinations

#### Scenario: Shortcut destination requires household entry
- **WHEN** a shortcut destination is requested without accepted household access
- **THEN** existing household-identity page-gate recovery applies rather than the shortcut bypassing household entry

### Requirement: Launch through the household root entry

The manifest start URL SHALL enter `/`. Root entry SHALL use household-identity requirements `Gate protected page entry with household access`, `Apply member context after household access` and `Route hydrated landing context to the next household page`. Launch metadata SHALL NOT imply an independent installed-app identity or guaranteed Home arrival.

#### Scenario: Start without household access
- **WHEN** the manifest start URL is requested without accepted household access
- **THEN** the existing household access gate handles entry and Welcome recovery

#### Scenario: Start with household context
- **WHEN** root entry passes page gates and reaches hydrated identity validation
- **THEN** the existing hydrated landing requirement determines the next requested household page

### Requirement: Account for supplied safe-area insets in app presentation

The root document SHALL request viewport fit cover. The shared app layout SHALL add supplied safe-area insets to its top padding when its header is hidden and to its bottom content clearance; displayed bottom navigation SHALL add the bottom inset to its padding.

#### Scenario: Header hidden in shared layout
- **WHEN** the shared layout hides its header and the browser supplies a top safe-area inset
- **THEN** its content top padding includes that inset

#### Scenario: Shared bottom navigation displayed
- **WHEN** the shared layout displays bottom navigation and the browser supplies a bottom safe-area inset
- **THEN** both navigation padding and content clearance include that inset

### Requirement: Request service-worker registration when supported

After document interaction is enabled, the application SHALL request registration of `/sw.js` when the browser exposes service-worker support. Registration SHALL NOT establish worker control, successful installation or offline availability.

#### Scenario: Browser exposes service workers
- **WHEN** the registration script runs in a browser exposing service-worker support
- **THEN** it requests registration of `/sw.js`

#### Scenario: Browser lacks service workers
- **WHEN** the registration script runs without service-worker support
- **THEN** it makes no service-worker registration request
