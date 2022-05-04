# Change log

- 2022 May 04, Wed
  - Add showdown options (e.g. 2-space indentation, emoji)
  - Includes preview and self-study modes
  - Add fetching external resources

---

As WaniKani Note still has [500-character's limit](https://community.wanikani.com/t/request-higher-characters-limit-in-the-notes/11474), the quickest fix is actually something like

```
{{https://raw.githubusercontent.com/showdownjs/showdown/master/README.md}}
```

That is, a template that pulls another online Markdown file found elsewhere. (and I might not put that Markdown file on Github.)

An addition after that is, pulling from WaniKani Community. Since Discourse can't just be parsed directly (and [has an API](https://community.wanikani.com/t/11462/39.json), anyway), it might be done with

```
{{community:11462/39}}
```
