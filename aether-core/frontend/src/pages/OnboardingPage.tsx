import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Target, Sparkles, Shield } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import { t } from '@/lib/i18n';

const ONBOARDING_STEPS = ['welcome', 'quick-wins', 'goals', 'control'] as const;
type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { updateSettings } = useMerchantSettings();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [isCompleting, setIsCompleting] = useState(false);

  const stepIndex = ONBOARDING_STEPS.indexOf(currentStep);
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(ONBOARDING_STEPS[stepIndex + 1]);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await updateSettings({ onboardingCompleted: true });
      navigate('/command-center');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setIsCompleting(false);
    }
  };

  const handleSkip = async () => {
    await updateSettings({ onboardingCompleted: true });
    navigate('/command-center');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {ONBOARDING_STEPS.map((step, idx) => (
            <div
              key={step}
              className={`h-2 rounded-full transition-all ${
                idx <= stepIndex ? 'bg-primary w-12' : 'bg-muted w-8'
              }`}
            />
          ))}
        </div>

        <Card className="rounded-3xl border-border/50 shadow-2xl">
          <CardContent className="p-12">
            {currentStep === 'welcome' && <WelcomeStep />}
            {currentStep === 'quick-wins' && <QuickWinsStep />}
            {currentStep === 'goals' && <GoalsStep />}
            {currentStep === 'control' && <ControlStep />}

            <div className="flex justify-between items-center mt-12 pt-8 border-t border-border/50">
              <Button variant="ghost" onClick={handleSkip} disabled={isCompleting}>
                {t('onboarding.skip')}
              </Button>
              <Button onClick={handleNext} disabled={isCompleting} size="lg">
                {isLastStep ? t('onboarding.getStarted') : t('onboarding.next')}
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WelcomeStep() {
  return (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
        <Sparkles size={40} className="text-primary" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight">{t('onboarding.welcome.title')}</h1>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
        {t('onboarding.welcome.subtitle')}
      </p>
      <div className="grid md:grid-cols-3 gap-6 mt-12">
        <FeatureCard
          icon={<Target size={24} />}
          title={t('onboarding.welcome.feature1.title')}
          description={t('onboarding.welcome.feature1.description')}
        />
        <FeatureCard
          icon={<Sparkles size={24} />}
          title={t('onboarding.welcome.feature2.title')}
          description={t('onboarding.welcome.feature2.description')}
        />
        <FeatureCard
          icon={<Shield size={24} />}
          title={t('onboarding.welcome.feature3.title')}
          description={t('onboarding.welcome.feature3.description')}
        />
      </div>
    </div>
  );
}

function QuickWinsStep() {
  const quickWins = [
    {
      icon: <CheckCircle2 size={24} className="text-success" />,
      title: t('onboarding.quickWins.item1.title'),
      description: t('onboarding.quickWins.item1.description'),
      impact: t('onboarding.quickWins.item1.impact'),
    },
    {
      icon: <CheckCircle2 size={24} className="text-success" />,
      title: t('onboarding.quickWins.item2.title'),
      description: t('onboarding.quickWins.item2.description'),
      impact: t('onboarding.quickWins.item2.impact'),
    },
    {
      icon: <CheckCircle2 size={24} className="text-success" />,
      title: t('onboarding.quickWins.item3.title'),
      description: t('onboarding.quickWins.item3.description'),
      impact: t('onboarding.quickWins.item3.impact'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3">{t('onboarding.quickWins.title')}</h2>
        <p className="text-lg text-muted-foreground">{t('onboarding.quickWins.subtitle')}</p>
        <p className="text-sm text-muted-foreground/80 mt-3 italic">
          {t('onboarding.quickWins.disclaimer')}
        </p>
      </div>
      <div className="space-y-4">
        {quickWins.map((win, idx) => (
          <Card key={idx} className="rounded-2xl border-success/20 bg-success/5">
            <CardContent className="p-6 flex gap-4">
              <div className="flex-shrink-0 mt-1">{win.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">{win.title}</h3>
                <p className="text-muted-foreground mb-2">{win.description}</p>
                <p className="text-sm font-medium text-success">{win.impact}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function GoalsStep() {
  const exampleGoals = [
    {
      title: t('onboarding.goals.example1.title'),
      description: t('onboarding.goals.example1.description'),
      agents: t('onboarding.goals.example1.agents'),
    },
    {
      title: t('onboarding.goals.example2.title'),
      description: t('onboarding.goals.example2.description'),
      agents: t('onboarding.goals.example2.agents'),
    },
    {
      title: t('onboarding.goals.example3.title'),
      description: t('onboarding.goals.example3.description'),
      agents: t('onboarding.goals.example3.agents'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3">{t('onboarding.goals.title')}</h2>
        <p className="text-lg text-muted-foreground">{t('onboarding.goals.subtitle')}</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {exampleGoals.map((goal, idx) => (
          <Card
            key={idx}
            className="rounded-2xl border-primary/20 hover:border-primary/40 transition-colors"
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <Target size={20} className="text-primary mt-1 flex-shrink-0" />
                <h3 className="font-semibold">{goal.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
              <p className="text-xs text-primary font-medium">{goal.agents}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground mt-6">{t('onboarding.goals.hint')}</p>
    </div>
  );
}

function ControlStep() {
  const autonomyLevels = [
    {
      level: t('onboarding.control.level1.name'),
      description: t('onboarding.control.level1.description'),
      example: t('onboarding.control.level1.example'),
    },
    {
      level: t('onboarding.control.level2.name'),
      description: t('onboarding.control.level2.description'),
      example: t('onboarding.control.level2.example'),
    },
    {
      level: t('onboarding.control.level3.name'),
      description: t('onboarding.control.level3.description'),
      example: t('onboarding.control.level3.example'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Shield size={32} className="text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-3">{t('onboarding.control.title')}</h2>
        <p className="text-lg text-muted-foreground">{t('onboarding.control.subtitle')}</p>
      </div>
      <div className="space-y-4">
        {autonomyLevels.map((level, idx) => (
          <Card key={idx} className="rounded-2xl">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-2">{level.level}</h3>
              <p className="text-muted-foreground mb-3">{level.description}</p>
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm">{level.example}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground mt-6">
        {t('onboarding.control.hint')}
      </p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="rounded-2xl border-border/30">
      <CardContent className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
          {icon}
        </div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
