# The-Gamified-Task-Tracker

Standard to-do lists can get boring and fail to keep users motivated. Develop a task-management app that turns productivity into a mini-game. When users check off real-world tasks (like studying or coding practice), they earn points or unlock simple digital badges. Key Focus: State management, local storage (or a simple database), and UI/UX design.

## What This App Does

- Adds tasks as "quests" with difficulty-based XP rewards.
- Adds quest categories (Study, Coding, Health, Career) for focused progress tracking.
- Awards XP only once per completed quest to prevent XP farming.
- Tracks progression with:
	- Level system with increasing XP requirements.
	- Per-level XP progress bar.
	- Daily streak count.
	- Total completed quests.
- Weekly rotating challenge with auto-awarded XP bonus on completion.
- Unlocks badges based on milestones (streaks, XP, completed quests, level, and category goals).
- Persists all app state with localStorage so progress survives refreshes.
- Supports clearing completed quests while keeping earned progress.
- Exports and imports progress JSON for backup and transfer.

## Tech Focus Areas

- State management in a single source-of-truth state object.
- Persistence with localStorage and resilient state hydration.
- UI/UX with animated, responsive card layout and in-app feedback toasts.
- Deterministic weekly challenge generation with week-based progress calculations.


