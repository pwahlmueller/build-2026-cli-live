/*
 * Eyes follow cursor (#55/#42). Owner: eyes feature agent.
 * Allowed file: features/eyes.js ONLY.
 * Track the pointer over the window and set ONLY --pupil-x / --pupil-y on #octocat
 * (via api.setCssVar). Do not transform the eyes directly (core owns blink).
 * Follows while the pointer is over the cat (transparent-window hit-testing limit).
 */
