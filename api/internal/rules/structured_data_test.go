package rules_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/yaaqin/builder-tool/internal/parser"
	"github.com/yaaqin/builder-tool/internal/rules"
)

func TestStructuredDataRule_Missing(t *testing.T) {
	findings := rules.StructuredDataRule{}.Check(&parser.PageFacts{})

	require.Len(t, findings, 1)
	assert.Equal(t, "SCHEMA_MISSING", findings[0].RuleID)
	assert.Equal(t, rules.Info, findings[0].Severity)
}

func TestStructuredDataRule_Invalid(t *testing.T) {
	facts := &parser.PageFacts{PageData: parser.PageData{
		JSONLD: []parser.JSONLDBlock{
			{Valid: true, Types: []string{"Organization"}, Raw: json.RawMessage(`{"@type":"Organization"}`)},
			{Valid: false},
		},
	}}

	ids := findingIDs(rules.StructuredDataRule{}.Check(facts))
	assert.Contains(t, ids, "SCHEMA_INVALID")
	assert.NotContains(t, ids, "SCHEMA_MISSING")
}

func TestStructuredDataRule_ProductIncomplete(t *testing.T) {
	facts := &parser.PageFacts{PageData: parser.PageData{
		JSONLD: []parser.JSONLDBlock{{
			Valid: true,
			Types: []string{"Product"},
			Raw:   json.RawMessage(`{"@type":"Product","name":"Shell AX7"}`),
		}},
	}}

	findings := rules.StructuredDataRule{}.Check(facts)
	ids := findingIDs(findings)
	require.Contains(t, ids, "SCHEMA_PRODUCT_INCOMPLETE")
	for _, f := range findings {
		if f.RuleID == "SCHEMA_PRODUCT_INCOMPLETE" {
			assert.Contains(t, f.Detail, "image")
			assert.Contains(t, f.Detail, "offers/price")
		}
	}
}

func TestStructuredDataRule_ProductComplete(t *testing.T) {
	facts := &parser.PageFacts{PageData: parser.PageData{
		JSONLD: []parser.JSONLDBlock{{
			Valid: true,
			Types: []string{"Product"},
			Raw:   json.RawMessage(`{"@type":"Product","name":"X","image":"a.jpg","offers":{"price":"10"}}`),
		}},
	}}

	assert.NotContains(t, findingIDs(rules.StructuredDataRule{}.Check(facts)), "SCHEMA_PRODUCT_INCOMPLETE")
}
