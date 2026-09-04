package rules

import "github.com/yaaqin/builder-tool/internal/parser"

type Severity int

const (
	Info Severity = iota
	Warning
	Critical
)

func (s Severity) String() string {
	switch s {
	case Critical:
		return "critical"
	case Warning:
		return "warning"
	default:
		return "info"
	}
}

type Finding struct {
	RuleID   string
	Severity Severity
	Title    string
	Detail   string
	Why      string
	Fix      string
	Evidence string
}

type Rule interface {
	ID() string
	Check(f *parser.PageFacts) []Finding
}

// Registry runs every registered rule against a page's facts. It does not
// sort or summarize the result — see the report package for that.
type Registry struct {
	rules []Rule
}

func NewRegistry(rules ...Rule) *Registry {
	return &Registry{rules: rules}
}

func (r *Registry) Run(f *parser.PageFacts) []Finding {
	var out []Finding
	for _, rule := range r.rules {
		out = append(out, rule.Check(f)...)
	}
	return out
}
