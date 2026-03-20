import SiteLayout from "@/components/SiteLayout";
import ProfileAnalyzerTool from "@/components/ProfileAnalyzerTool";
import SEOHead from "@/components/SEOHead";

const ProfileAnalyzer = () => (
  <SiteLayout>
    <SEOHead
      title="TikTok Profile Analyzer — View Any Creator's Stats Free"
      description="Analyze any TikTok profile for free. View follower count, likes, video stats, and engagement metrics. No login required."
      path="/profile-analyzer"
    />
    <ProfileAnalyzerTool />
  </SiteLayout>
);

export default ProfileAnalyzer;
