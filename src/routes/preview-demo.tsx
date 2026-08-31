import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SocialMediaPreviewCard, type SocialPlatform } from "@/components/social-media-preview-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/preview-demo")({
  head: () => ({
    meta: [
      { title: "Preview Demo — Social Media Connective Admin" },
      { name: "description", content: "Social Media Preview Card component demo." },
    ],
  }),
  component: PreviewDemoPage,
});

const sampleImages = [
  { src: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80", alt: "Fitness" },
  { src: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80", alt: "Gym" },
  { src: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80", alt: "Yoga" },
  { src: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80", alt: "Cardio" },
  { src: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=800&q=80", alt: "Wellness" },
];

function PreviewDemoPage() {
  const [platform, setPlatform] = useState<SocialPlatform>("facebook");

  return (
    <>
      <PageHeader
        title="Social Media Preview Card"
        subtitle="Interactive demo of the reusable social media preview component."
      />

      <div className="space-y-8">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <Label className="text-sm font-medium">Platform Style</Label>
          <Select value={platform} onValueChange={(v) => setPlatform(v as SocialPlatform)}>
            <SelectTrigger className="mt-2 w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="twitter">Twitter / X</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">1 Photo</h2>
          <SocialMediaPreviewCard
            platform={platform}
            profileImage="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80"
            profileName="Divine Medical Spa"
            timestamp={new Date(Date.now() - 2 * 3600000).toISOString()}
            content="Discover our latest Hydrafacial treatment. Your skin deserves the best care. #SkinCare #Hydrafacial #GlowUp"
            images={sampleImages.slice(0, 1)}
            likes={24}
            comments={5}
            shares={3}
            onHashtagClick={(tag) => alert(`Clicked: #${tag}`)}
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">2 Photos</h2>
          <SocialMediaPreviewCard
            platform={platform}
            profileName="Northline Dental"
            timestamp={new Date(Date.now() - 86400000).toISOString()}
            content="Healthy smile, healthy life. Book your check-up today! #DentalCare #SmileMore"
            images={sampleImages.slice(0, 2)}
            likes={18}
            comments={0}
            shares={7}
            onHashtagClick={(tag) => alert(`Clicked: #${tag}`)}
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">3 Photos</h2>
          <SocialMediaPreviewCard
            platform={platform}
            profileImage="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=100&q=80"
            profileName="Harbor Fitness Co."
            timestamp={new Date(Date.now() - 3 * 86400000).toISOString()}
            content="Start your fitness journey with us! New member special: 50% off first month. #Fitness #Workout #NewYear"
            images={sampleImages.slice(0, 3)}
            likes={42}
            comments={12}
            shares={11}
            onHashtagClick={(tag) => alert(`Clicked: #${tag}`)}
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">4 Photos (Grid)</h2>
          <SocialMediaPreviewCard
            platform={platform}
            profileName="Divine Medical Spa"
            timestamp={new Date(Date.now() - 7 * 86400000).toISOString()}
            content="Before & after results speak for themselves. Our clients trust us for real transformations. #Results #Confidence"
            images={sampleImages.slice(0, 4)}
            likes={156}
            comments={28}
            shares={43}
            onHashtagClick={(tag) => alert(`Clicked: #${tag}`)}
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">5+ Photos (+N overlay)</h2>
          <SocialMediaPreviewCard
            platform={platform}
            profileImage="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"
            profileName="Harbor Fitness Co."
            timestamp={new Date(Date.now() - 14 * 86400000).toISOString()}
            content="Weekend vibes at the gym. Who's ready for Monday? #FitnessMotivation #GymLife #FitFam"
            images={sampleImages}
            likes={89}
            comments={7}
            shares={5}
            onHashtagClick={(tag) => alert(`Clicked: #${tag}`)}
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Text Only</h2>
          <SocialMediaPreviewCard
            platform={platform}
            profileName="Northline Dental"
            timestamp={new Date().toISOString()}
            content="Did you know? Brushing twice a day can prevent 70% of dental issues. Keep that smile shining! #DentalTips #OralHealth"
            likes={31}
            comments={4}
            shares={12}
            onHashtagClick={(tag) => alert(`Clicked: #${tag}`)}
          />
        </section>
      </div>
    </>
  );
}
