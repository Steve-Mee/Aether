import { CodeAnalyzerService } from '../services/CodeAnalyzerService';

export class AnalyzeCodebaseUseCase {
  private analyzer = new CodeAnalyzerService();

  async execute() {
    // Scan all modules
    const modules = await this.analyzer.scanModules();
    
    // Analyze each module for improvement opportunities
    const proposals = [];
    
    for (const module of modules) {
      const moduleProposals = await this.analyzer.analyzeModule(module);
      proposals.push(...moduleProposals);
    }

    return proposals;
  }
}