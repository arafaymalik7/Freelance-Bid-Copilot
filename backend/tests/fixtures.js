const classificationFixture = {
  category: "web_development",
  confidence: 0.92,
  reasoning: "The brief centers on building a business website with transactional functionality.",
  typical_stack: ["React", "Node.js", "Stripe"],
  pricing_unit: "per_project",
};

const extractionFixture = {
  main_deliverable: "A polished ecommerce storefront for a boutique clothing business.",
  features: [
    "Product catalog with category pages",
    "Customer accounts with order tracking",
    "Secure Stripe checkout flow",
    "Basic admin tools for order management",
  ],
  deadline_hint: "Client wants launch readiness within about 6 weeks.",
  budget_hint: null,
  technical_requirements: ["Stripe integration", "Responsive design", "Admin dashboard"],
  assumptions: ["Hosting platform is not selected yet", "Product photography will be supplied by the client"],
  client_experience_level: "intermediate",
  project_size: "medium",
};

const gapsFixture = {
  missing_info: ["Preferred CMS or custom build approach", "Exact product variant complexity"],
  risk_flags: ["Scope may expand if inventory workflows are custom", "Design revisions could affect the timeline"],
  follow_up_questions: [
    {
      question: "Do you want a custom admin dashboard or a Shopify-style managed backend?",
      why_important: "The backend approach changes both build time and maintenance scope.",
      answer_type: "choice",
      choices: ["Custom dashboard", "Managed platform", "Need your recommendation"],
    },
    {
      question: "Will each product need size, color, or other variant combinations?",
      why_important: "Variant complexity affects product modeling and checkout logic.",
      answer_type: "yes_no",
      choices: null,
    },
    {
      question: "Do you already have product copy and photography prepared?",
      why_important: "Content readiness can materially affect delivery speed.",
      answer_type: "yes_no",
      choices: null,
    },
    {
      question: "Do you need shipping rules by region or flat-rate shipping only?",
      why_important: "Shipping logic can add configuration and testing complexity.",
      answer_type: "choice",
      choices: ["Flat rate", "By region", "Local pickup only"],
    },
  ],
};

const refinedExtractionFixture = {
  ...extractionFixture,
  features: [...extractionFixture.features, "Regional shipping configuration"],
  assumptions: ["Final content assets are still pending"],
  refinement_round: 1,
  new_follow_up_questions: [
    {
      question: "Do you need discount codes at launch?",
      why_important: "Promotional features can affect the shopping cart rules and QA scope.",
      answer_type: "yes_no",
      choices: null,
    },
  ],
};

const scopeFixture = {
  project_summary:
    "This project covers the design and delivery of a responsive ecommerce website for a boutique clothing brand. The work includes storefront UX, checkout, customer account basics, and a lightweight admin flow for managing orders.",
  in_scope: [
    "Homepage, catalog, product, cart, checkout, and account screens",
    "Stripe payment integration and order confirmation flow",
    "Responsive UI for desktop and mobile",
    "Admin order management dashboard with core actions",
  ],
  out_of_scope: [
    "Marketplace integrations such as Amazon or eBay",
    "Custom ERP or warehouse management integrations",
    "Ongoing marketing automation setup",
  ],
  milestones: [
    {
      name: "Discovery and planning",
      deliverable: "Finalized sitemap, feature list, and technical approach",
      estimated_days: 3,
    },
    {
      name: "UI implementation",
      deliverable: "Responsive storefront screens and reusable components",
      estimated_days: 7,
    },
    {
      name: "Commerce and admin",
      deliverable: "Checkout, payments, account features, and admin order flow",
      estimated_days: 8,
    },
    {
      name: "QA and launch support",
      deliverable: "Testing, bug fixes, and launch-readiness handoff",
      estimated_days: 4,
    },
  ],
  total_estimated_days: 22,
  recommended_revision_rounds: 2,
  payment_structure: "40% upfront, 40% at feature-complete review, 20% on final handoff",
};

const pricingFixture = {
  currency: "USD",
  basic: {
    min: 1800,
    max: 2400,
    includes: "Essential storefront pages, responsive layout, and a streamlined checkout setup.",
    timeline: "3-4 weeks",
  },
  recommended: {
    min: 2600,
    max: 3400,
    includes: "Full storefront, customer accounts, order tracking, admin workflow, and structured QA.",
    timeline: "4-6 weeks",
  },
  premium: {
    min: 3800,
    max: 4800,
    includes: "Everything in recommended plus accelerated delivery, extra revision capacity, and launch support.",
    timeline: "2-3 weeks rush",
  },
  hourly_equivalent: 58,
  pricing_notes: [
    "Custom integrations or advanced shipping logic would increase the estimate.",
    "Content delays should be treated as timeline risks rather than included implementation time.",
    "Use staged payments to protect cash flow and approval checkpoints.",
  ],
};

const proposalFixture = {
  subject_line: "Proposal for Your Boutique Ecommerce Website",
  proposal_draft:
    "Hi,\n\nThanks for sharing the brief for your boutique ecommerce website. I understand you need a polished online store that feels premium, supports customer accounts, allows order tracking, and gives you a straightforward way to manage incoming orders. Based on the requirements so far, I would approach this as a focused ecommerce build with a responsive storefront, a clear purchase flow, Stripe integration, and a lightweight admin experience for day-to-day operations.\n\nThe project scope I recommend includes the main storefront pages, product browsing, product detail views, cart and checkout, account basics, and core admin functionality for order handling. I would break delivery into planning, interface implementation, commerce features, and final QA so that each stage is reviewable and keeps the work moving cleanly. This also helps reduce surprises around scope and makes pricing easier to keep aligned with the actual effort.\n\nFor this level of scope, my recommended budget range is $2,600 to $3,400 USD, with delivery in roughly 4 to 6 weeks depending on turnaround for content and feedback. A payment structure of 40 percent upfront, 40 percent at feature-complete review, and 20 percent on final handoff keeps the project protected on both sides. If this direction looks right, I can send over a final statement of work after we confirm the remaining details around shipping rules and launch requirements.\n\nBest,\nYour Freelancer",
  client_reply:
    "Thanks for the brief. I can help you turn this into a clean ecommerce site with a solid checkout and order management flow. Before I lock the estimate, could you confirm whether you want simple flat-rate shipping or region-based shipping rules? If helpful, I can also suggest the most practical platform approach based on your budget and timeline.",
};

module.exports = {
  classificationFixture,
  extractionFixture,
  gapsFixture,
  pricingFixture,
  proposalFixture,
  refinedExtractionFixture,
  scopeFixture,
};

