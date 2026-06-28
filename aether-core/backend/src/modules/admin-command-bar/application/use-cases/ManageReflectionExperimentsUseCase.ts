import type { ReflectionExperimentService } from '../../../../ai/intelligence/personal-brain/reflection/experiments/ReflectionExperimentService';
import type { ReflectionVariantConfig } from '../../../../ai/intelligence/personal-brain/reflection/experiments/types';

export class ManageReflectionExperimentsUseCase {
  constructor(private experiments: ReflectionExperimentService) {}

  list() {
    return this.experiments.listExperiments();
  }

  create(params: { name: string; bucketMin?: number; bucketMax?: number; variantConfig: ReflectionVariantConfig }) {
    return this.experiments.createExperiment(params);
  }

  stop(id: string) {
    return this.experiments.stopExperiment(id);
  }

  getOutcomes(experimentId: string) {
    return this.experiments.getOutcomesAggregated(experimentId);
  }
}
