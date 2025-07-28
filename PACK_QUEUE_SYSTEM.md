# Pack Queue System Implementation

## Overview

This system implements a queue-based booster pack system with the following features:

- **Single active timer per category**: Only one active timer per pack type (humanoid/weapon)
- **Queue system**: Up to 5 boosters can be queued per category
- **Manual completion**: Users choose to open or save completed packs
- **Real-time updates**: Live timer display and queue status

## Features

### ✅ Core Rules
- **1 active timer per category** (humanoid/weapon)
- **5 total limit per category** (1 active + 4 queued)
- **Manual completion** - no auto-start
- **Queue management** - automatic position updates

### ✅ UI Updates
- **Queue status display** (1/5, 4/5, etc.)
- **Disabled buttons** when limits reached
- **Color-coded status indicators**
- **Real-time timer updates**

## API Endpoints

### POST /api/timers
Create a new timer with queue support.

**Request:**
```json
{
  "packType": "humanoid",
  "delayHours": 4
}
```

**Response:**
```json
{
  "success": true,
  "message": "Timer started for humanoid pack",
  "timerId": "uuid",
  "queuePosition": 0,
  "isActive": true
}
```

### GET /api/timers
Get current timers and queue status.

**Response:**
```json
{
  "success": true,
  "data": {
    "activeTimers": [...],
    "queuedTimers": [...],
    "categoryStats": {
      "humanoid": { "activeCount": 1, "queueCount": 3 },
      "weapon": { "activeCount": 0, "queueCount": 2 }
    }
  }
}
```

### POST /api/timers/complete
Complete a timer with open/save action.

**Request:**
```json
{
  "timerId": "uuid",
  "action": "open" // or "save"
}
```

## Database Schema Changes

### New Columns in `active_timers`
- `queue_position`: INTEGER (0 for active, 1+ for queued)
- `is_active`: BOOLEAN (true if currently running)
- `is_completed`: BOOLEAN (true if finished)
- `is_saved`: BOOLEAN (true if saved for later)

### Indexes
- `idx_active_timers_user_category_active`: For efficient active timer queries
- `idx_active_timers_user_category_queue`: For efficient queue queries

## Usage Examples

### Starting a Timer
When no active timer exists:
```
✅ Start Timer button enabled
Status: Ready to start
```

When active timer exists:
```
⏳ Timer Active button disabled
Status: Active timer running
```

When queue has items:
```
📋 2/5 in queue
Status: Added to queue (position 2)
```

### Queue Management
- **Position 0**: Active timer (running)
- **Position 1-4**: Queued timers (waiting)
- **Next in line**: Automatically becomes active when current completes

## Testing

### Manual Testing
1. **Start first timer**: Should succeed
2. **Try second same category**: Should fail with limit message
3. **Start different category**: Should succeed
4. **Queue up to 5**: Should add to queue with position
5. **Complete timer**: Should activate next in queue

### API Testing
Use the provided test files:
- `test-pack-queue-system.http` - REST client tests
- `test-queue-system.js` - Node.js script

## Migration

Run the SQL migration to update the database:
```sql
-- The migration file: 20250728010000_add_pack_queue_system.sql
-- Updates active_timers table and adds necessary indexes
```

## Error Messages

### Common Errors
- `An active timer already exists for humanoid packs. Please wait for it to complete.`
- `Maximum queue limit reached. You can only queue up to 5 humanoid boosters at a time.`
- `Timer is not yet ready. X minutes remaining.`

## UI Updates

### Pack Cards Display
- **Active**: Shows "⏳ Active timer running"
- **Queued**: Shows "📋 X/5 in queue"
- **Ready**: Shows "✅ Ready to start"
- **Queue Full**: Shows "Queue Full" with disabled button

## Next Steps

1. **Deploy database changes** using Supabase migrations
2. **Test with real users** to ensure all limits work correctly
3. **Monitor** queue usage patterns
4. **Consider** adding queue reordering features in future updates