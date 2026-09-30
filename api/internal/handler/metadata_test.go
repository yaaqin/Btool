package handler

import (
	"testing"

	"github.com/yaaqin/builder-tool/internal/parser"
)

func issueFor(t *testing.T, dtos []metaTagDTO, tag string) string {
	t.Helper()
	for _, d := range dtos {
		if d.Tag == tag {
			return d.Issue
		}
	}
	t.Fatalf("tag %q not present", tag)
	return ""
}

func TestToMetaTagDTOs_FlagsOGImageCompanionsWithoutImage(t *testing.T) {
	meta := &parser.MetadataResult{Tags: []parser.MetaTag{
		{Tag: "og:image", Value: ""},
		{Tag: "og:image:width", Value: "1200"},
		{Tag: "title", Value: ""},
	}}
	dtos := toMetaTagDTOs(meta)

	if got := issueFor(t, dtos, "og:image"); got != issueIncomplete {
		t.Errorf("og:image issue = %q, want %q", got, issueIncomplete)
	}
	if got := issueFor(t, dtos, "title"); got != "" {
		t.Errorf("plain missing title issue = %q, want none", got)
	}
}

func TestToMetaTagDTOs_NoIssueWhenOGImageSetOrAllEmpty(t *testing.T) {
	for name, meta := range map[string]*parser.MetadataResult{
		"image set": {Tags: []parser.MetaTag{{Tag: "og:image", Value: "https://x/y.jpg"}, {Tag: "og:image:width", Value: "1200"}}},
		"all empty": {Tags: []parser.MetaTag{{Tag: "og:image"}, {Tag: "og:image:width"}}},
	} {
		if got := issueFor(t, toMetaTagDTOs(meta), "og:image"); got != "" {
			t.Errorf("%s: og:image issue = %q, want none", name, got)
		}
	}
}

func TestToMetaTagDTOs_FlagsInvalidJSONLD(t *testing.T) {
	meta := &parser.MetadataResult{
		Tags:          []parser.MetaTag{{Tag: "json-ld", Value: "Organization"}},
		InvalidJSONLD: 1,
	}
	if got := issueFor(t, toMetaTagDTOs(meta), "json-ld"); got != issueInvalidJSONLD {
		t.Errorf("json-ld issue = %q, want %q", got, issueInvalidJSONLD)
	}
}
