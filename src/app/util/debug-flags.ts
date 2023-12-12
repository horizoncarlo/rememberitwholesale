export class DebugFlags {
  // Debug to use the dial instead of toolbar regardless of screen size
  static DEBUG_FORCE_USE_DIAL = false;
  
  // Debug toggle to delay our initial call for Things
  static DEBUG_SIMULATE_LATENCY = false;
  
  // Debug to test reminders by firing them as due a few seconds after creation, instead of waiting until their actual time
  static DEBUG_FAST_REMINDERS = false;
}