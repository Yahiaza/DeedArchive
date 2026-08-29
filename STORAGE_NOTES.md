# v0.2.4

- Added live Gregorian date, Arabic weekday, and clock to the application header.
- Added configurable local data location.
- The default remains Electron userData/archive-data.
- Choosing another folder creates/uses DeedArchiveData inside it.
- Current deeds.sqlite, attachments, and update settings are copied to the new location.
- Existing databases in the chosen location are never overwritten without an explicit choice.
- Attachment absolute paths are repaired after migration so old attachments continue to open.
- The chosen location is remembered in storage-location.json under Electron userData.
- After a Windows format, if the database is on another drive, reinstall/run the app and choose the same folder again; the app can use the existing database.
