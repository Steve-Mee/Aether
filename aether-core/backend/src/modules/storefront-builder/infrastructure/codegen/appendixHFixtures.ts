/**
 * Appendix H fixtures — re-export barrel.
 * Normative contract for AllowlistCodegenCompiler and P06 agent fallbacks.
 */

export {
  APPENDIX_H_PLAN,
  APPENDIX_H_TOKENS,
  APPENDIX_H_HOME_TREE,
  APPENDIX_H_PRODUCTS_TREE,
  APPENDIX_H_PDP_TREE,
  APPENDIX_H_ABOUT_TREE,
  APPENDIX_H_CONTACT_TREE,
  APPENDIX_H_LEGAL_TREE,
  APPENDIX_H_COPY_NL,
  APPENDIX_H_TREES_BY_TEMPLATE,
  type AppendixHTemplate,
} from './appendixHData';

export {
  appendixHTokensToDesignTokens,
  normalizeTokensInput,
  emitAppendixHTokensJson,
} from './appendixHTokens';

export {
  brandNameFromBrief,
  treeForTemplate,
  expandToCompilableSitePlan,
} from './appendixHExpand';
