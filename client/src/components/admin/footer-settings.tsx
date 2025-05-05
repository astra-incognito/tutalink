import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Plus, Trash } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type FooterLink = {
  text: string;
  href: string;
};

export default function FooterSettings() {
  const { settings, isLoading, updateSetting, createSetting, isUpdating, isCreating } = useSiteSettings();
  const [activeTab, setActiveTab] = useState("general");
  const [copyrightText, setCopyrightText] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);
  const [newLinkDialogOpen, setNewLinkDialogOpen] = useState(false);
  const [newLink, setNewLink] = useState<FooterLink>({ text: "", href: "" });
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);

  // Load settings when available
  useEffect(() => {
    if (!isLoading && settings.length > 0) {
      const copyright = settings.find(s => s.key === "footer.copyright")?.value;
      if (copyright) setCopyrightText(copyright);
      
      const facebook = settings.find(s => s.key === "footer.social.facebook")?.value;
      if (facebook) setFacebookUrl(facebook);
      
      const instagram = settings.find(s => s.key === "footer.social.instagram")?.value;
      if (instagram) setInstagramUrl(instagram);
      
      const twitter = settings.find(s => s.key === "footer.social.twitter")?.value;
      if (twitter) setTwitterUrl(twitter);
      
      try {
        const linksJson = settings.find(s => s.key === "footer.links")?.value;
        if (linksJson) {
          const parsedLinks = JSON.parse(linksJson);
          if (Array.isArray(parsedLinks)) {
            setFooterLinks(parsedLinks);
          }
        }
      } catch (error) {
        console.error("Error parsing footer links", error);
      }
    }
  }, [isLoading, settings]);

  const handleSaveGeneral = async () => {
    await updateSetting({ 
      key: "footer.copyright", 
      value: copyrightText 
    });
  };

  const handleSaveSocial = async () => {
    await updateSetting({ 
      key: "footer.social.facebook", 
      value: facebookUrl 
    });
    await updateSetting({ 
      key: "footer.social.instagram", 
      value: instagramUrl 
    });
    await updateSetting({ 
      key: "footer.social.twitter", 
      value: twitterUrl 
    });
  };

  const handleSaveLinks = async () => {
    await updateSetting({ 
      key: "footer.links", 
      value: JSON.stringify(footerLinks)
    });
  };

  const handleAddLink = () => {
    if (editingLinkIndex !== null) {
      // Edit existing link
      const updatedLinks = [...footerLinks];
      updatedLinks[editingLinkIndex] = newLink;
      setFooterLinks(updatedLinks);
    } else {
      // Add new link
      setFooterLinks([...footerLinks, newLink]);
    }
    setNewLink({ text: "", href: "" });
    setNewLinkDialogOpen(false);
    setEditingLinkIndex(null);
  };

  const handleEditLink = (index: number) => {
    setNewLink(footerLinks[index]);
    setEditingLinkIndex(index);
    setNewLinkDialogOpen(true);
  };

  const handleDeleteLink = (index: number) => {
    const updatedLinks = [...footerLinks];
    updatedLinks.splice(index, 1);
    setFooterLinks(updatedLinks);
  };

  const createSettingIfNeeded = async (key: string, value: string, category: string, description: string) => {
    const setting = settings.find(s => s.key === key);
    if (!setting) {
      await createSetting({
        key,
        value,
        category,
        description
      });
    }
  };

  const initializeSettings = async () => {
    // Create settings if they don't exist
    await createSettingIfNeeded(
      "footer.copyright",
      "&copy; 2023 TutaLink. All rights reserved.",
      "footer",
      "Copyright text for the website footer"
    );
    
    await createSettingIfNeeded(
      "footer.social.facebook",
      "#",
      "footer",
      "Facebook URL for the website footer"
    );
    
    await createSettingIfNeeded(
      "footer.social.instagram",
      "#",
      "footer",
      "Instagram URL for the website footer"
    );
    
    await createSettingIfNeeded(
      "footer.social.twitter",
      "#", 
      "footer",
      "Twitter URL for the website footer"
    );
    
    await createSettingIfNeeded(
      "footer.links",
      JSON.stringify([
        { text: "About", href: "/about" },
        { text: "Blog", href: "/blog" },
        { text: "FAQ", href: "/faq" },
        { text: "Privacy", href: "/privacy" },
        { text: "Terms", href: "/terms" },
        { text: "Contact", href: "/contact" }
      ]),
      "footer",
      "Navigation links for the website footer"
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Footer Settings</CardTitle>
        <CardDescription>
          Manage the content displayed in the website footer
        </CardDescription>
      </CardHeader>
      <CardContent>
        {settings.length === 0 && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2">
              You need to initialize footer settings before you can edit them.
            </p>
            <Button 
              onClick={initializeSettings}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                "Initialize Footer Settings"
              )}
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="links">Footer Links</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="space-y-4">
              <div className="grid gap-3">
                <Label htmlFor="copyright-text">Copyright Text</Label>
                <Textarea 
                  id="copyright-text" 
                  value={copyrightText}
                  onChange={(e) => setCopyrightText(e.target.value)}
                  rows={2}
                  placeholder="&copy; 2023 TutaLink. All rights reserved."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  HTML is allowed (e.g., &amp;copy; for the copyright symbol)
                </p>
              </div>
              
              <Button 
                onClick={handleSaveGeneral}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save General Settings
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="social">
            <div className="space-y-4">
              <div className="grid gap-3">
                <Label htmlFor="facebook-url">Facebook URL</Label>
                <Input 
                  id="facebook-url" 
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/your-page"
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="instagram-url">Instagram URL</Label>
                <Input 
                  id="instagram-url" 
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/your-account"
                />
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="twitter-url">Twitter URL</Label>
                <Input 
                  id="twitter-url" 
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://twitter.com/your-account"
                />
              </div>
              
              <Button 
                onClick={handleSaveSocial}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Social Media Settings
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="links">
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Footer Navigation Links</h3>
                <Dialog open={newLinkDialogOpen} onOpenChange={setNewLinkDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={() => {
                      setNewLink({ text: "", href: "" });
                      setEditingLinkIndex(null);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Link
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingLinkIndex !== null ? "Edit Footer Link" : "Add Footer Link"}
                      </DialogTitle>
                      <DialogDescription>
                        Enter the details for the footer navigation link.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="link-text">Link Text</Label>
                        <Input
                          id="link-text"
                          value={newLink.text}
                          onChange={(e) => setNewLink({ ...newLink, text: e.target.value })}
                          placeholder="About Us"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="link-href">Link URL</Label>
                        <Input
                          id="link-href"
                          value={newLink.href}
                          onChange={(e) => setNewLink({ ...newLink, href: e.target.value })}
                          placeholder="/about"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewLinkDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddLink} disabled={!newLink.text || !newLink.href}>
                        {editingLinkIndex !== null ? "Save Changes" : "Add Link"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Link Text</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {footerLinks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4">
                          No links added yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      footerLinks.map((link, index) => (
                        <TableRow key={index}>
                          <TableCell>{link.text}</TableCell>
                          <TableCell>{link.href}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditLink(index)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteLink(index)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <Button 
                onClick={handleSaveLinks}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Links
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8">
          <Accordion type="single" collapsible>
            <AccordionItem value="preview">
              <AccordionTrigger>Footer Preview</AccordionTrigger>
              <AccordionContent>
                <div className="bg-gray-100 p-4 rounded-md mt-2">
                  <div className="flex flex-wrap justify-center gap-4 mb-4">
                    {footerLinks.map((link, index) => (
                      <a key={index} className="text-sm text-blue-600 hover:underline">
                        {link.text}
                      </a>
                    ))}
                  </div>
                  <div className="flex justify-center gap-4 mb-4">
                    <a className="text-gray-500" href={facebookUrl} target="_blank" rel="noopener noreferrer">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                      </svg>
                    </a>
                    <a className="text-gray-500" href={instagramUrl} target="_blank" rel="noopener noreferrer">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                      </svg>
                    </a>
                    <a className="text-gray-500" href={twitterUrl} target="_blank" rel="noopener noreferrer">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07a4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                    </a>
                  </div>
                  <p 
                    className="text-sm text-center text-gray-500"
                    dangerouslySetInnerHTML={{ __html: copyrightText }}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}