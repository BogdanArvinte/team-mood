# Team Mood

Record and display team mood.

## Requirements

A `db.json` file with the following format is required in the root of the project:

```json
{
  "teams": [
    {
      "name": "TEAM1",
      "entries": []
    },
    {
      "name": "TEAM2",
      "entries": []
    }
  ]
}
```

> To add teams, simply create a new entry with the fields `name` (String) and `entries` (Array)
