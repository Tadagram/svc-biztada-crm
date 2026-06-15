export interface Tool {
  name: string;
  description: string;
  [key: string]: any;
}

export class ToolRAG {
  /**
   * Tokenize a string into lowercase words, ignoring punctuation.
   */
  private tokenize(text: string): Set<string> {
    const words = text.toLowerCase().match(/\p{L}+|\d+/gu) || [];
    return new Set(words);
  }

  /**
   * Search and return the topK most relevant tools based on the query.
   */
  public search(query: string, tools: Tool[], topK: number = 10): Tool[] {
    const queryTokens = this.tokenize(query);

    // If the query is empty or too short, just return the first few tools.
    if (queryTokens.size === 0) return tools.slice(0, topK);

    const scoredTools = tools.map((tool) => {
      const nameTokens = this.tokenize(tool.name);
      const descTokens = this.tokenize(tool.description || '');
      const docTokens = new Set([...nameTokens, ...descTokens]);

      let overlapCount = 0;
      for (const token of queryTokens) {
        if (docTokens.has(token)) {
          overlapCount += 1;
          // Extra weight if it matches the API name
          if (nameTokens.has(token)) overlapCount += 1.5;
        }
      }

      const score = overlapCount / queryTokens.size;
      return { tool, score };
    });

    scoredTools.sort((a, b) => b.score - a.score);

    // If no matches found, fallback to the first topK tools
    if (scoredTools.length > 0 && scoredTools[0].score === 0) {
      return tools.slice(0, topK);
    }

    return scoredTools.slice(0, topK).map((st) => st.tool);
  }
}

export const toolRAG = new ToolRAG();
