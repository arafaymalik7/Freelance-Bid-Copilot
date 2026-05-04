export const classificationFixture = {
  category: "web_development",
  subcategory: "ecommerce_store",
  complexity_signal: "medium",
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
  pricing_basis: [
    "Similar ecommerce project references support a mid-range fixed project price.",
    "Stripe, accounts, and admin tools increase complexity beyond a brochure site.",
  ],
  what_would_increase_price: [
    "Advanced shipping zones, discounts, tax handling, or custom inventory workflows.",
  ],
  pricing_sanity: {
    clamped: false,
    original_ranges: {
      basic: { min: 1800, max: 2200 },
      recommended: { min: 2600, max: 3200 },
      premium: { min: 3600, max: 4400 },
    },
    final_ranges: {
      basic: { min: 1800, max: 2200 },
      recommended: { min: 2600, max: 3200 },
      premium: { min: 3600, max: 4400 },
    },
    reason: "AI pricing stayed within freelancer-realistic guardrails.",
  },
};

export const proposalFixture = {
  subject_line: "Proposal for Your Boutique Ecommerce Website",
  proposal_draft:
    "Thanks for sharing the brief. I understand you need a premium ecommerce experience that helps your boutique brand sell online with a polished storefront, a simple buying experience, customer accounts, and basic order management. My approach would be to define the final scope first, then move through interface implementation, commerce setup, and focused testing so there is a clear review point at each major milestone. That keeps the build organized and gives you visibility into progress while protecting the timeline.\n\nThe recommended scope includes the key storefront pages, product detail views, checkout flow, account basics, and a lightweight admin workflow for handling orders. Based on the current requirements, the recommended investment is positioned in the mid-range tier so the project has enough room for quality execution, solid QA, and a cleaner launch process. Delivery would land around four to six weeks depending on turnaround for feedback and content. If you confirm the shipping model and any promotional requirements, I can turn this into a final scope and proposal immediately.",
  client_reply:
    "Thanks for the brief. I can help you shape this into a premium ecommerce site with a strong checkout and customer experience. Before I lock the final estimate, can you confirm whether you need flat-rate shipping or region-based shipping rules? That will help me finalize the implementation scope accurately.",
};

export const ragContextFixture = {
  source_ids: ["case_web_ecommerce_boutique", "price_web_ecommerce_base"],
  similar_cases: [
    {
      id: "case_web_ecommerce_boutique",
      title: "Boutique ecommerce storefront",
      category: "web_development",
      subcategory: "ecommerce_store",
      similarity: 0.84,
      relevance_explanation: "Similar product catalog, checkout, accounts, and order admin scope.",
      scope_summary: "Boutique storefront with Stripe checkout and order management.",
      features: ["Product catalog", "Stripe checkout", "Customer accounts"],
      risk_flags: ["Shipping rules can expand scope"],
      price_range: { low: 2200, high: 4200 },
      timeline_days: { min: 18, max: 30 },
      complexity: "medium",
    },
  ],
};

export const workspaceFixture = {
  workspace_id: "workspace_test",
  stage: "clarification",
  brief: "Need a boutique ecommerce website with checkout and accounts.",
  preferences: { region: "US/global USD", urgency: "normal" },
  classification: classificationFixture,
  ragContext: ragContextFixture,
  similar_projects: ragContextFixture.similar_cases,
  extraction: extractionFixture,
  gaps: gapsFixture,
  readiness: {
    score: 64,
    status: "needs_review",
    can_generate: true,
    blockers: ["Shipping method details"],
  },
  refinement_round: 0,
};

export const evaluationFixture = {
  overall_score: 84,
  verdict: "Strong but needs clearer risk handling.",
  scores: {
    scope_clarity: 18,
    pricing_justification: 17,
    risk_coverage: 12,
    missing_info_handling: 12,
    professional_tone: 13,
    rag_grounding: 12,
  },
  strengths: ["Specific scope", "Clear pricing tiers"],
  concerns: ["Shipping assumptions need stronger wording"],
  recommendations: ["Clarify exclusions around advanced shipping and discounts."],
};

export const workspacePackageFixture = {
  workspace_id: "workspace_test",
  stage: "quality_review",
  ragContext: ragContextFixture,
  similar_projects: ragContextFixture.similar_cases,
  package: {
    scope: scopeFixture,
    pricing: pricingFixture,
    proposal: proposalFixture,
  },
  evaluation: evaluationFixture,
};

export const quickBidFixture = {
  workspace_id: "workspace_quick",
  brief: workspaceFixture.brief,
  classification: classificationFixture,
  confidence: {
    score: 72,
    label: "Medium",
    reason: "Generated with clear assumptions; answering 2 key questions can improve accuracy.",
  },
  critical_questions: [
    {
      question: "Do products need size and color variants?",
      why_it_matters: "Variants change product modeling and checkout testing.",
      answer_type: "yes_no",
      choices: [],
      default_assumption: "Assume standard launch-ready scope and exclude advanced custom additions unless confirmed.",
      impact: "scope",
    },
    {
      question: "Do you need flat-rate or region-based shipping?",
      why_it_matters: "Shipping rules affect checkout setup and testing scope.",
      answer_type: "choice",
      choices: ["Flat rate", "Region based"],
      default_assumption: "Assume a normal delivery timeline with no rush surcharge unless confirmed.",
      impact: "timeline",
    },
  ],
  assumptions: [
    "Client will provide final product images.",
    "Assume standard launch-ready scope and exclude advanced custom additions unless confirmed.",
  ],
  similar_projects: ragContextFixture.similar_cases,
  bid_strategy: {
    positioning: "Position this as a web development project focused on a boutique ecommerce launch.",
    winning_angle: "Lead with premium storefront, reliable checkout, and clear order management.",
    delivery_approach: "Use milestone-based delivery with discovery, storefront implementation, commerce QA, and handoff.",
    negotiation_advice: "Anchor around the recommended package and protect scope with exclusions.",
  },
  estimate_evidence: {
    similar_projects: ragContextFixture.similar_cases,
    related_references: [],
    pricing_basis: pricingFixture.pricing_basis,
    retrieval_quality: {
      close_matches: 1,
      related_references: 0,
      rules_used: 4,
      coverage_level: "strong",
      why_retrieved: ["matched web development category and ecommerce store subcategory"],
    },
    scope_patterns: ["Responsive storefront pages", "Checkout flow", "Excluded: ERP integrations"],
    risks_considered: gapsFixture.risk_flags,
  },
  assumption_strategy: {
    generated_with_assumptions: true,
    assumptions: [
      "Client will provide final product images.",
      "Assume standard launch-ready scope and exclude advanced custom additions unless confirmed.",
    ],
    accuracy_boosts: [
      {
        question: "Do products need size and color variants?",
        impact: "scope",
        why_answering_helps: "Variants change product modeling and checkout testing.",
      },
    ],
    summary: "The package is usable now. Answering 2 optional questions can tighten pricing, scope, or timeline.",
  },
  deal_snapshot: {
    project_type: "web development / ecommerce store",
    buyer_intent: "Client has some buying signals in the brief.",
    urgency: "normal",
    estimated_difficulty: "Moderate",
    bid_confidence: "Medium",
    confidence_score: 72,
  },
  recommended_package: "recommended",
  package_comparison: {
    basic: "Core storefront and checkout.",
    recommended: "Full storefront, accounts, and admin features.",
    premium: "Rush delivery and extra revision support.",
    recommendation_reason:
      "Recommended is selected by default because it balances price, delivery confidence, and scope protection.",
  },
  package_options: {
    basic: {
      label: "Lean MVP",
      scope_summary: "Core storefront and checkout.",
      proposal_angle: "Position this as the fastest safe version with only the launch essentials.",
      tradeoffs: ["Best when budget control matters most."],
      exclusions: scopeFixture.out_of_scope,
      pricing_paragraph: "The lean package is $1800 - $2200 and should be framed as a controlled MVP.",
    },
    recommended: {
      label: "Balanced Bid",
      scope_summary: "Full storefront, accounts, and admin features.",
      proposal_angle: "Position this as the best balance of quality, scope protection, and delivery confidence.",
      tradeoffs: ["Best default for a serious client-ready bid."],
      exclusions: scopeFixture.out_of_scope,
      pricing_paragraph: "The recommended package is $2600 - $3200, with scope protected by clear assumptions and exclusions.",
    },
    premium: {
      label: "Expanded / Faster Delivery",
      scope_summary: "Rush delivery and extra revision support.",
      proposal_angle: "Position this as the higher-touch option for speed, polish, and launch support.",
      tradeoffs: ["Best when the client wants speed or stronger launch support."],
      exclusions: scopeFixture.out_of_scope,
      pricing_paragraph: "The premium package is $3600 - $4400 and should be sold as added speed, support, or delivery depth.",
    },
  },
  package_proposals: {
    basic: {
      subject_line: "Proposal for Your Boutique Ecommerce Website",
      proposal_draft:
        "Thanks for sharing the brief. I understand you need a boutique ecommerce launch.\n\nFor the Lean MVP package, I would keep the scope focused on: Core storefront and checkout.\n\nPosition this as the fastest safe version with only the launch essentials.\n\nThe lean package is $1800 - $2200 and should be framed as a controlled MVP.",
      client_reply:
        "Thanks for the brief. I can help with a focused ecommerce launch. Based on the current scope, I would likely propose the Lean MVP package first.",
      package_label: "Lean MVP",
      package_tier: "basic",
    },
    recommended: {
      subject_line: "Proposal for Your Boutique Ecommerce Website",
      proposal_draft:
        "Thanks for sharing the brief. I understand you need a boutique ecommerce launch.\n\nFor the Balanced Bid package, I would keep the scope focused on: Full storefront, accounts, and admin features.\n\nPosition this as the best balance of quality, scope protection, and delivery confidence.\n\nThe recommended package is $2600 - $3200, with scope protected by clear assumptions and exclusions.",
      client_reply:
        "Thanks for the brief. I can help with a focused ecommerce launch. Based on the current scope, I would likely propose the Balanced Bid package first.",
      package_label: "Balanced Bid",
      package_tier: "recommended",
    },
    premium: {
      subject_line: "Proposal for Your Boutique Ecommerce Website",
      proposal_draft:
        "Thanks for sharing the brief. I understand you need a boutique ecommerce launch.\n\nFor the Expanded / Faster Delivery package, I would keep the scope focused on: Rush delivery and extra revision support.\n\nPosition this as the higher-touch option for speed, polish, and launch support.\n\nThe premium package is $3600 - $4400 and should be sold as added speed, support, or delivery depth.",
      client_reply:
        "Thanks for the brief. I can help with a focused ecommerce launch. Based on the current scope, I would likely propose the Expanded / Faster Delivery package first.",
      package_label: "Expanded / Faster Delivery",
      package_tier: "premium",
    },
  },
  proposal_sections: {
    opener:
      "Thanks for sharing the brief. I understand you need a premium ecommerce experience for your boutique brand.",
    understanding: "A boutique ecommerce website with customer accounts and order tracking.",
    approach:
      "Use milestone-based delivery with discovery, storefront implementation, commerce QA, and handoff.",
    timeline: "Estimated delivery is 15 days, subject to feedback and content readiness.",
    pricing_paragraph:
      "The recommended package is $2600 - $3200, with scope protected by clear assumptions and exclusions.",
    assumptions: [
      "Client will provide final product images.",
      "Assume standard launch-ready scope and exclude advanced custom additions unless confirmed.",
    ],
    next_step: proposalFixture.client_reply,
  },
  risk_playbook: {
    risks: gapsFixture.risk_flags,
    mitigation_wording: ["Clarify variant complexity before treating it as included scope."],
    exclusions_to_state: scopeFixture.out_of_scope,
    client_safe_note:
      "The proposal should stay confident while making assumptions explicit, so the freelancer is protected without sounding defensive.",
  },
  evidence_board: {
    similar_work: ragContextFixture.similar_cases,
    related_references: [],
    pricing_logic: pricingFixture.pricing_basis,
    retrieval_quality: {
      close_matches: 1,
      related_references: 0,
      rules_used: 4,
      coverage_level: "strong",
      why_retrieved: ["matched web development category and ecommerce store subcategory"],
    },
    scope_logic: ["Responsive storefront pages", "Checkout flow", "Excluded: ERP integrations"],
    risks_considered: gapsFixture.risk_flags,
    no_close_match: false,
  },
  retrieval_quality: {
    close_matches: 1,
    related_references: 0,
    rules_used: 4,
    coverage_level: "strong",
    why_retrieved: ["matched web development category and ecommerce store subcategory"],
  },
  package: workspacePackageFixture.package,
  evaluation: evaluationFixture,
};
