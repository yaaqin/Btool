package report

import (
	"sort"

	"github.com/yaaqin/builder-tool/internal/rules"
)

type Summary struct {
	Critical int `json:"critical"`
	Warning  int `json:"warning"`
	Info     int `json:"info"`
}

// Sort orders findings most severe first, stably, so same-severity
// findings keep the order the rules produced them in.
func Sort(findings []rules.Finding) []rules.Finding {
	sorted := make([]rules.Finding, len(findings))
	copy(sorted, findings)
	sort.SliceStable(sorted, func(i, j int) bool {
		return sorted[i].Severity > sorted[j].Severity
	})
	return sorted
}

func Summarize(findings []rules.Finding) Summary {
	var s Summary
	for _, f := range findings {
		switch f.Severity {
		case rules.Critical:
			s.Critical++
		case rules.Warning:
			s.Warning++
		default:
			s.Info++
		}
	}
	return s
}
