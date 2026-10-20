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

export default function GoalsSection() {
  return (
    <section className="goals-section section" id="goals" aria-labelledby="goals-title">
      <div className="container">
        <div className="goals-header">
          <div>
            <span className="label">Founding charter</span>
            <h2 id="goals-title" className="goals-title">
              Eight commitments<br /><em>we keep.</em>
            </h2>
          </div>
          <p className="goals-lede">
            Since our founding, these eight goals have guided every program we
            run and every community we walk beside.
          </p>
        </div>

        <ol className="charter">
          {GOALS.map(goal => (
            <li className="charter-cell" key={goal.numeral}>
              <span className="poster charter-numeral" aria-hidden="true">{goal.numeral}</span>
              <h3 className="charter-title">{goal.title}</h3>
              <p className="charter-text">{goal.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
