"use client";

import { useState, useEffect } from "react";
import { authClient, useSession } from "@/lib/auth-client";

interface Link {
  id: number;
  shortCode: string;
  originalUrl: string;
  clicks: number;
  createdAt: string;
}

export default function Home() {
  const { data: session, isPending } = useSession();
  const [url, setUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [shortenedUrl, setShortenedUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (session) {
      fetchLinks();
    }
  }, [session]);

  const fetchLinks = async () => {
    try {
      setIsLoadingLinks(true);
      const response = await fetch("/api/links");
      if (response.ok) {
        const data = await response.json();
        setLinks(data.links);
      }
    } catch (err) {
      console.error("Failed to fetch links:", err);
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this link?")) {
      return;
    }

    try {
      const response = await fetch(`/api/links/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLinks(links.filter(link => link.id !== id));
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete link");
      }
    } catch (err) {
      alert("An error occurred while deleting the link");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShortenedUrl("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          customSlug: customSlug || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create short link");
      }

      setShortenedUrl(`${getOrigin()}/${data.shortCode}`);
      setUrl("");
      setCustomSlug("");
      fetchLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shortenedUrl);
  };

  const getOrigin = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  const handleLogin = async () => {
    await authClient.signIn.social({
      provider: "hca",
      callbackURL: "/",
      errorCallbackURL: "/error",
      newUserCallbackURL: "/",
    });
  };

  const handleLogout = async () => {
    await authClient.signOut();
  };

  if (isPending || !mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-lg text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-800">
          <h1 className="mb-2 text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            sus.cx
          </h1>
          <p className="mb-8 text-center text-zinc-600 dark:text-zinc-400">
            A link shortener for Hack Clubbers
          </p>
          <button
            onClick={handleLogin}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Sign in with Hack Club
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              sus.cx
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Signed in as {session.user.email || session.user.name}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="url"
                className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2"
              >
                Target URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/imposter/sussy"
                required
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="customSlug"
                className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2"
              >
                Custom Slug (optional)
              </label>
              <input
                type="text"
                id="customSlug"
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                placeholder="my-custom-link"
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Leave empty for a random short code
              </p>
            </div>

            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Do not link to anything that would get me in legal trouble. All links created are logged and associated with you.
            </p>
          </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {shortenedUrl && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                  Short link created!
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shortenedUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white dark:bg-zinc-700 border border-green-300 dark:border-green-700 rounded text-sm text-zinc-900 dark:text-zinc-50"
                  />
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? "Creating..." : "Shorten URL"}
            </button>
          </form>
        </div>

        {/* Links List */}
        <div className="mt-8 bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
            Your Links
          </h2>

          {isLoadingLinks ? (
            <p className="text-center text-zinc-600 dark:text-zinc-400">Loading...</p>
          ) : links.length === 0 ? (
            <p className="text-center text-zinc-600 dark:text-zinc-400">
              No links created yet. Create your first one above!
            </p>
          ) : (
            <div className="space-y-4">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <a
                        href={`/${link.shortCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        sus.cx/{link.shortCode}
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${getOrigin()}/${link.shortCode}`);
                        }}
                        className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                        title="Copy link"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                      {link.originalUrl}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                      <span>{link.clicks} clicks</span>
                      <span>Created {new Date(link.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}