import "./GoalsSection.css";

const GOALS = [
  {
    numeral: "I",
    title: "Organize & Educate",
    text: "To assist in organizing and educating Faith-based People's Organizations (FBPO) as a vehicle for lay empowerment and social transformation.",
  },
  {
    numeral: "II",
    title: "Form Leaders",
    text: "To capacitate and develop leaders rooted in faith and fervor for organizing and advocacy work, serving as a training institute toward lay empowerment and social transformation.",
  },
  {
    numeral: "III",
    title: "Mobilize the Young",
    text: "To organize youth and children at the area level for education and theatre-group formation, in support of eliminating forced child labor and reducing poverty toward its eradication.",
  },
  {
    numeral: "IV",
    title: "Shelter the Vulnerable",
    text: "To safeguard and provide a Drop-In Center for abused, vulnerable, and exploited children.",
  },
  {
    numeral: "V",
    title: "Grow Food Security",
    text: "To promote food security and poverty reduction through sustainable agriculture, sustainable livelihood, and micro-finance.",
  },
  {
    numeral: "VI",
    title: "Care for Health",
    text: "To enhance community-based health programs and services for basic health care and preventive measures.",
  },
  {
    numeral: "VII",
    title: "Keep the Record",
    text: "To conduct social research, especially on children and vulnerable adults, and to open our data bank, research center, and pastoral archives to the basic sector and to those who seek to serve the poor.",
  },
  {
    numeral: "VIII",
    title: "Build Resilience",
    text: "To integrate Disaster Risk Reduction and Climate Change adaptation and gender equity across all programs.",
  },
];

function LedgerEntry({ goal, index }) {
  return (
    <article className="ledger-entry">
      <div className="entry-seal" aria-hidden="true">
        <span>{goal.numeral}</span>
      </div>
      <div className="entry-body">
        <h3 className="entry-title">
          <span className="entry-number">Goal {index + 1}</span>
          {goal.title}
        </h3>
        <p className="entry-text">{goal.text}</p>
      </div>
    </article>
  );
}

export default function GoalsSection() {
  return (
    <section className="goals-section" id="goals" aria-labelledby="goals-title">
      <div className="goals-header">
        <span className="goals-eyebrow">Founding Charter</span>
        <h2 id="goals-title" className="goals-title">
          Eight Commitments We Keep
        </h2>
        <p className="goals-lede">
          Since our founding, these eight goals have guided every program we
          run and every community we walk beside — set down here as the
          organization's standing charter.
        </p>
      </div>

      <div className="ledger">
        <div className="ledger-page ledger-page--left">
          {GOALS.slice(0, 4).map((goal, i) => (
            <LedgerEntry key={goal.numeral} goal={goal} index={i} />
          ))}
        </div>
        <div className="ledger-spine" aria-hidden="true" />
        <div className="ledger-page ledger-page--right">
          {GOALS.slice(4).map((goal, i) => (
            <LedgerEntry key={goal.numeral} goal={goal} index={i + 4} />
          ))}
        </div>
      </div>
    </section>
  );
}
