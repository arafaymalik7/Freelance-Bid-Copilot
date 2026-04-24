export const classificationFixture = {
  category: "web_development",
  confidence: 0.89,
  reasoning: "The client is asking for a business website with commerce capability.",
  typical_stack: ["React", "Node.js", "Stripe"],
  pricing_unit: "per_project",
};

export const extractionFixture = {
  main_deliverable: "A boutique ecommerce website with customer accounts and order tracking.",
  features: [
    "Product catalog",
    "Customer accounts",
    "Stripe checkout",
    "Order tracking",
  ],
  deadline_hint: "Launch in about 6 weeks",
  budget_hint: null,
  technical_requirements: ["Stripe integration", "Responsive design"],
  assumptions: ["Client will provide product images", "Shipping logic is still being defined"],
  client_experience_level: "intermediate",
  project_size: "medium",
};

export const gapsFixture = {
  missing_info: ["Shipping method details"],
  risk_flags: ["Variant complexity could expand scope"],
  follow_up_questions: [
    {
      question: "Do you need flat-rate shipping or region-based shipping?",
      why_important: "Shipping rules affect checkout setup and testing scope.",
      answer_type: "choice",
      choices: ["Flat rate", "Region based"],
    },
    {
      question: "Will products have size and color variants?",
      why_important: "Variants change product modeling and admin complexity.",
      answer_type: "yes_no",
      choices: null,
    },
  ],
};

export const refinedExtractionFixture = {
  ...extractionFixture,
  features: [...extractionFixture.features, "Region-based shipping rules"],
  assumptions: ["Client will provide final product images"],
  refinement_round: 1,
  new_follow_up_questions: [
    {
      question: "Do you need discount codes at launch?",
      why_important: "Discount logic adds additional cart behavior and QA.",
      answer_type: "yes_no",
      choices: null,
    },
  ],
};

export const finalRefinedExtractionFixture = {
  ...extractionFixture,
  refinement_round: 2,
  new_follow_up_questions: [],
};

export const scopeFixture = {
  project_summary:
    "A premium ecommerce storefront for a boutique clothing label, including purchasing flow, customer accounts, and an admin area for order management.",
  in_scope: [
    "Responsive storefront pages",
    "Checkout flow",
    "Customer account features",
    "Admin order tools",
  ],
  out_of_scope: ["Marketplace integrations", "ERP integrations", "Paid marketing setup"],
  milestones: [
    { name: "Discovery", deliverable: "Scope confirmation", estimated_days: 3 },
    { name: "Design and build", deliverable: "Storefront implementation", estimated_days: 8 },
    { name: "Commerce QA", deliverable: "Checkout and admin testing", estimated_days: 4 },
  ],
  total_estimated_days: 15,
  recommended_revision_rounds: 2,
  payment_structure: "40% upfront, 40% on review, 20% on launch",
};

export const pricingFixture = {
  currency: "USD",
  basic: {
    min: 1800,
    max: 2200,
    includes: "Core storefront and checkout.",
    timeline: "3-4 weeks",
  },
  recommended: {
    min: 2600,
    max: 3200,
    includes: "Full storefront, accounts, and admin features.",
    timeline: "4-6 weeks",
  },
  premium: {
    min: 3600,
    max: 4400,
    includes: "Rush delivery and extra revision support.",
    timeline: "2-3 weeks rush",
  },
  hourly_equivalent: 55,
  pricing_notes: [
    "Shipping complexity can increase effort.",
    "Content delays affect schedule, not just development time.",
    "Use staged payments for approval checkpoints.",
  ],
};

export const proposalFixture = {
  subject_line: "Proposal for Your Boutique Ecommerce Website",
  proposal_draft:
    "Thanks for sharing the brief. I understand you need a premium ecommerce experience that helps your boutique brand sell online with a polished storefront, a simple buying experience, customer accounts, and basic order management. My approach would be to define the final scope first, then move through interface implementation, commerce setup, and focused testing so there is a clear review point at each major milestone. That keeps the build organized and gives you visibility into progress while protecting the timeline.\n\nThe recommended scope includes the key storefront pages, product detail views, checkout flow, account basics, and a lightweight admin workflow for handling orders. Based on the current requirements, the recommended investment is positioned in the mid-range tier so the project has enough room for quality execution, solid QA, and a cleaner launch process. Delivery would land around four to six weeks depending on turnaround for feedback and content. If you confirm the shipping model and any promotional requirements, I can turn this into a final scope and proposal immediately.",
  client_reply:
    "Thanks for the brief. I can help you shape this into a premium ecommerce site with a strong checkout and customer experience. Before I lock the final estimate, can you confirm whether you need flat-rate shipping or region-based shipping rules? That will help me finalize the implementation scope accurately.",
};

