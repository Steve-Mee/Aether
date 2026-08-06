import { useState } from 'react';
import { Target, Mail, TrendingUp, Package, Users, BarChart3, Bot } from 'lucide-react';
import { Card, CardContent, Badge } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { t } from '@/lib/i18n';

type AgentCapability = {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  strengths: string[];
  goalTypes: string[];
  /** Aligned to docs/feature-status.json — never claim live without runtime evidence. */
  status: 'live' | 'partial' | 'experimental';
  featureStatusKey: string;
};

/** Mirrors aether-core/docs/feature-status.json for merchant-facing honesty. */
const FEATURE_STATUS_BADGE: Record<string, 'live' | 'partial' | 'experimental'> = {
  'aether-mail': 'partial',
  'supplier-intelligence': 'live',
  'admin-command-bar': 'partial',
  'inventory-pricing': 'partial',
  'marketing-promotion-agent': 'partial',
  'returns-quality-agent': 'partial',
};

const AGENT_CAPABILITIES: AgentCapability[] = [
  {
    id: 'mail',
    name: t('capabilities.agents.mail.name'),
    icon: <Mail size={24} />,
    description: t('capabilities.agents.mail.description'),
    strengths: [
      t('capabilities.agents.mail.strength1'),
      t('capabilities.agents.mail.strength2'),
      t('capabilities.agents.mail.strength3'),
    ],
    goalTypes: [
      t('capabilities.agents.mail.goal1'),
      t('capabilities.agents.mail.goal2'),
    ],
    featureStatusKey: 'aether-mail',
    status: FEATURE_STATUS_BADGE['aether-mail'],
  },
  {
    id: 'supplier',
    name: t('capabilities.agents.supplier.name'),
    icon: <Users size={24} />,
    description: t('capabilities.agents.supplier.description'),
    strengths: [
      t('capabilities.agents.supplier.strength1'),
      t('capabilities.agents.supplier.strength2'),
      t('capabilities.agents.supplier.strength3'),
    ],
    goalTypes: [
      t('capabilities.agents.supplier.goal1'),
      t('capabilities.agents.supplier.goal2'),
    ],
    featureStatusKey: 'supplier-intelligence',
    status: FEATURE_STATUS_BADGE['supplier-intelligence'],
  },
  {
    id: 'pricing',
    name: t('capabilities.agents.pricing.name'),
    icon: <TrendingUp size={24} />,
    description: t('capabilities.agents.pricing.description'),
    strengths: [
      t('capabilities.agents.pricing.strength1'),
      t('capabilities.agents.pricing.strength2'),
      t('capabilities.agents.pricing.strength3'),
    ],
    goalTypes: [
      t('capabilities.agents.pricing.goal1'),
      t('capabilities.agents.pricing.goal2'),
    ],
    featureStatusKey: 'admin-command-bar',
    status: FEATURE_STATUS_BADGE['admin-command-bar'],
  },
  {
    id: 'inventory',
    name: t('capabilities.agents.inventory.name'),
    icon: <Package size={24} />,
    description: t('capabilities.agents.inventory.description'),
    strengths: [
      t('capabilities.agents.inventory.strength1'),
      t('capabilities.agents.inventory.strength2'),
      t('capabilities.agents.inventory.strength3'),
    ],
    goalTypes: [
      t('capabilities.agents.inventory.goal1'),
      t('capabilities.agents.inventory.goal2'),
    ],
    featureStatusKey: 'inventory-pricing',
    status: FEATURE_STATUS_BADGE['inventory-pricing'],
  },
  {
    id: 'promotion',
    name: t('capabilities.agents.promotion.name'),
    icon: <BarChart3 size={24} />,
    description: t('capabilities.agents.promotion.description'),
    strengths: [
      t('capabilities.agents.promotion.strength1'),
      t('capabilities.agents.promotion.strength2'),
      t('capabilities.agents.promotion.strength3'),
    ],
    goalTypes: [
      t('capabilities.agents.promotion.goal1'),
      t('capabilities.agents.promotion.goal2'),
    ],
    featureStatusKey: 'marketing-promotion-agent',
    status: FEATURE_STATUS_BADGE['marketing-promotion-agent'],
  },
  {
    id: 'returns',
    name: 'Returns & Quality',
    icon: <Package size={24} />,
    description: 'Analyseert retourpatronen, signaleert leverancierskwaliteit en stelt reductieacties voor.',
    strengths: ['Retourpatronen', 'Kwaliteitssignalen', 'Reductie-suggesties'],
    goalTypes: ['Retourpercentage verlagen', 'Leverancierskwaliteit verbeteren'],
    featureStatusKey: 'returns-quality-agent',
    status: FEATURE_STATUS_BADGE['returns-quality-agent'],
  },
];

type DemoExample = {
  id: string;
  title: string;
  description: string;
  agents: string[];
  impact: string;
  category: 'efficiency' | 'revenue' | 'cost-reduction';
};

const DEMO_EXAMPLES: DemoExample[] = [
  {
    id: 'demo1',
    title: t('capabilities.examples.demo1.title'),
    description: t('capabilities.examples.demo1.description'),
    agents: ['Supplier Intelligence', 'Pricing Agent'],
    impact: t('capabilities.examples.demo1.impact'),
    category: 'cost-reduction',
  },
  {
    id: 'demo2',
    title: t('capabilities.examples.demo2.title'),
    description: t('capabilities.examples.demo2.description'),
    agents: ['Inventory Agent', 'Supplier Intelligence'],
    impact: t('capabilities.examples.demo2.impact'),
    category: 'efficiency',
  },
  {
    id: 'demo3',
    title: t('capabilities.examples.demo3.title'),
    description: t('capabilities.examples.demo3.description'),
    agents: ['Promotion Agent', 'Pricing Agent'],
    impact: t('capabilities.examples.demo3.impact'),
    category: 'revenue',
  },
];

export default function CapabilitiesPage() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'efficiency' | 'revenue' | 'cost-reduction'>('all');

  const filteredExamples = selectedCategory === 'all' 
    ? DEMO_EXAMPLES 
    : DEMO_EXAMPLES.filter(ex => ex.category === selectedCategory);

  return (
    <ModulePageLayout
      title={t('capabilities.page.title')}
      subtitle={t('capabilities.page.subtitle')}
      featureKey="capability-hub"
      testId="capabilities-page"
      loading={false}
      error={null}
      maxWidth="6xl"
    >
      <div className="space-y-12 motion-safe:animate-fade-in">
        {/* Agent Capabilities Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Bot size={28} className="text-primary" />
            <h2 className="text-2xl font-bold">{t('capabilities.agents.title')}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AGENT_CAPABILITIES.map((agent) => (
              <Card key={agent.id} className="rounded-2xl border-border/50 hover:border-primary/30 transition-all hover:shadow-md">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                        {agent.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold">{agent.name}</h3>
                        <StatusBadge status={agent.status} />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                  
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {t('capabilities.agents.strengths')}
                    </h4>
                    <ul className="space-y-1">
                      {agent.strengths.map((strength, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {t('capabilities.agents.goalTypes')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {agent.goalTypes.map((goal, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          <Target size={12} className="mr-1" />
                          {goal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Demo Examples Section */}
        <section className="space-y-4">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-3">{t('capabilities.examples.title')}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Badge variant="outline" className="text-xs">
                {t('capabilities.examples.demoLabel')}
              </Badge>
              <span>{t('capabilities.examples.demoDisclaimer')}</span>
            </div>
            
            {/* Category Filter */}
            <div className="flex gap-2">
              {(['all', 'efficiency', 'revenue', 'cost-reduction'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {t(`capabilities.examples.category.${cat}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {filteredExamples.map((example) => (
              <Card key={example.id} className="rounded-2xl border-border/50">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">{example.title}</h3>
                      <CategoryBadge category={example.category} />
                    </div>
                    <p className="text-sm text-muted-foreground">{example.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {example.agents.map((agent, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        <Bot size={12} className="mr-1" />
                        {agent}
                      </Badge>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-border/50">
                    <p className="text-sm font-medium text-success">{example.impact}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-12">
          <Card className="rounded-2xl border-primary/20 bg-primary/5">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-bold mb-2">{t('capabilities.cta.title')}</h3>
              <p className="text-muted-foreground mb-4">{t('capabilities.cta.subtitle')}</p>
              <div className="flex justify-center gap-3">
                <a href="/goals" className="inline-flex items-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                  <Target size={18} className="mr-2" />
                  {t('capabilities.cta.setGoal')}
                </a>
                <a href="/command-center" className="inline-flex items-center px-6 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                  {t('capabilities.cta.explore')}
                </a>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </ModulePageLayout>
  );
}

function StatusBadge({ status }: { status: 'live' | 'partial' | 'experimental' }) {
  const variants = {
    live: 'bg-success/10 text-success',
    partial: 'bg-warning/10 text-warning',
    experimental: 'bg-muted text-muted-foreground',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[status]}`}>
      {t(`capabilities.status.${status}`)}
    </span>
  );
}

function CategoryBadge({ category }: { category: DemoExample['category'] }) {
  const variants = {
    efficiency: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    revenue: 'bg-green-500/10 text-green-600 dark:text-green-400',
    'cost-reduction': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  };

  return (
    <Badge variant="outline" className={`text-xs ${variants[category]}`}>
      {t(`capabilities.examples.category.${category}`)}
    </Badge>
  );
}
