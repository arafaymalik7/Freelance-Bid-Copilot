const { buildVectorIndex } = require("../services/vectorSearchService");
const { validateKnowledgeBase } = require("../services/knowledgeBaseService");

async function main() {
  const validation = validateKnowledgeBase();
  const index = await buildVectorIndex({ persist: true });

  console.log(
    `Built vector index with ${index.length} entries from ${validation.totalEntries} knowledge records.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
