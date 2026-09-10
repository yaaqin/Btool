package rules

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/yaaqin/builder-tool/internal/parser"
)

type StructuredDataRule struct{}

func (StructuredDataRule) ID() string { return "structured_data" }

func (StructuredDataRule) Check(f *parser.PageFacts) []Finding {
	blocks := f.PageData.JSONLD

	if len(blocks) == 0 {
		return []Finding{{
			RuleID:   "SCHEMA_MISSING",
			Severity: Info,
			Title:    "No structured data (JSON-LD)",
			Detail:   `No <script type="application/ld+json"> block was found.`,
			Why:      "Structured data lets search engines show rich results (ratings, prices, breadcrumbs, FAQ, etc.) and understand the page's entity type.",
			Fix:      "Add JSON-LD for the schema.org type that fits this page (Article, Product, Organization, …).",
		}}
	}

	var findings []Finding

	invalid := 0
	for _, b := range blocks {
		if !b.Valid {
			invalid++
		}
	}
	if invalid > 0 {
		findings = append(findings, Finding{
			RuleID:   "SCHEMA_INVALID",
			Severity: Warning,
			Title:    "Structured data block did not parse",
			Detail:   fmt.Sprintf("%d of %d JSON-LD block(s) contain invalid JSON.", invalid, len(blocks)),
			Why:      "A JSON-LD block that can't be parsed is ignored entirely by search engines — the markup effectively doesn't exist.",
			Fix:      "Validate each block with the Rich Results Test or a JSON linter and fix the syntax error.",
		})
	}

	if inc := incompleteProduct(blocks); inc != "" {
		findings = append(findings, Finding{
			RuleID:   "SCHEMA_PRODUCT_INCOMPLETE",
			Severity: Info,
			Title:    "Product schema is missing recommended fields",
			Detail:   "Product JSON-LD is present but missing: " + inc + ".",
			Why:      "Without name, image, and an offer/price, the Product markup won't qualify for a product rich result.",
			Fix:      "Add the missing fields to the Product JSON-LD.",
		})
	}

	return findings
}

// incompleteProduct returns a comma-joined list of missing recommended
// fields for the first Product block found, or "" if there's no Product
// block or it has everything.
func incompleteProduct(blocks []parser.JSONLDBlock) string {
	for _, b := range blocks {
		if !b.Valid || !containsType(b.Types, "Product") {
			continue
		}

		var parsed any
		if err := json.Unmarshal(b.Raw, &parsed); err != nil {
			continue
		}
		obj := findProductObject(parsed)
		if obj == nil {
			continue
		}

		var missing []string
		if _, ok := obj["name"]; !ok {
			missing = append(missing, "name")
		}
		if _, ok := obj["image"]; !ok {
			missing = append(missing, "image")
		}
		_, hasOffers := obj["offers"]
		_, hasPrice := obj["price"]
		if !hasOffers && !hasPrice {
			missing = append(missing, "offers/price")
		}
		if len(missing) > 0 {
			return strings.Join(missing, ", ")
		}
	}
	return ""
}

func containsType(types []string, want string) bool {
	for _, t := range types {
		if strings.EqualFold(t, want) {
			return true
		}
	}
	return false
}

// findProductObject walks a JSON-LD value (object, array, or @graph
// wrapper) and returns the first map whose @type is Product.
func findProductObject(v any) map[string]any {
	switch node := v.(type) {
	case []any:
		for _, item := range node {
			if obj := findProductObject(item); obj != nil {
				return obj
			}
		}
	case map[string]any:
		if graph, ok := node["@graph"].([]any); ok {
			for _, item := range graph {
				if obj := findProductObject(item); obj != nil {
					return obj
				}
			}
		}
		if typeIsProduct(node["@type"]) {
			return node
		}
	}
	return nil
}

func typeIsProduct(v any) bool {
	switch t := v.(type) {
	case string:
		return strings.EqualFold(t, "Product")
	case []any:
		for _, tv := range t {
			if s, ok := tv.(string); ok && strings.EqualFold(s, "Product") {
				return true
			}
		}
	}
	return false
}
