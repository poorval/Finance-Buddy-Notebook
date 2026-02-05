# Changelog

All notable changes to the Finance Buddy project will be documented in this file.

## [Unreleased] - 2026-01-26

### Added
- **Multi-User Isolation**: Implemented `user_id` segregation across SQLite and Supabase backends. API now respects user context.
- **Visual Transformations**:
    - **Layout Swap**: Added a toggle button in the dashboard to swap the Chat and Dashboard panels with a smooth spring animation.
    - **Flip-to-Edit Budget**: The Budget card now flips 3D-style to allow editing the global budget, persisted to the database.
    - **Subtle Scrollbars**: Replaced native browser scrollbars with a sleek Custom ScrollArea for a premium feel.
- **Inline UI Actions**:
    - **Add Expense Bubble**: Interactive form appears directly in chat. Submits data immediately via API and transforms into a subtle success checkmark.
    - **Inline Insights**: "Insights" action now renders a tabular spending breakdown within the chat stream.
- **Category Management**: Added support for creating new categories ("Create category [Name]") and transferring expenses.

### Changed
- **Dashboard Layout**: 
    - Flexible height for cards to ensure grid alignment.
    - Moved "Edit Budget" button to content area for better UX.
- **Chat Experience**:
    - Improved stability for tool outputs.
    - "Add Expense" is now fully integrated into the chat flow rather than a popup modal.

### Deprecated
- **Split Bill**: The "Split Bill" button has been temporarily disabled/marked as "Coming Soon".

### Fixed
- **Budget Persistence**: Dashboard now correctly reads and writes a persistent global budget instead of summing category defaults.
- **Data Consistency**: Resolved calculation mismatches (e.g., negative remaining amounts) in dashboard stats.
- **UI Glitches**: Fixed 3D backface visibility issues on the Budget Flip Card.
