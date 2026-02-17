import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertTriangle,
  Activity,
  Ban,
  Clock,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

interface SecurityMetrics {
  totalRequests: number;
  blockedRequests: number;
  suspiciousIPs: number;
  blockedIPs: number;
  rateLimit429s: number;
  authFailures: number;
}

interface IPInfo {
  ip: string;
  violations: number;
  lastSeen: string;
  status: "suspicious" | "blocked";
}

export default function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalRequests: 15847,
    blockedRequests: 23,
    suspiciousIPs: 5,
    blockedIPs: 2,
    rateLimit429s: 18,
    authFailures: 7,
  });

  const [suspiciousIPs, setSuspiciousIPs] = useState<IPInfo[]>([
    {
      ip: "192.168.1.100",
      violations: 4,
      lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: "suspicious",
    },
    {
      ip: "10.0.0.50",
      violations: 3,
      lastSeen: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      status: "suspicious",
    },
  ]);

  const [blockedIPs, setBlockedIPs] = useState<IPInfo[]>([
    {
      ip: "203.0.113.42",
      violations: 8,
      lastSeen: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      status: "blocked",
    },
    {
      ip: "198.51.100.99",
      violations: 12,
      lastSeen: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      status: "blocked",
    },
  ]);

  const [securityEvents, setSecurityEvents] = useState([
    {
      id: 1,
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      type: "rate_limit",
      severity: "warning",
      message: "Rate limit exceeded for IP 192.168.1.100",
      ip: "192.168.1.100",
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      type: "blocked_ip",
      severity: "high",
      message: "IP blocked due to repeated violations: 203.0.113.42",
      ip: "203.0.113.42",
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      type: "auth_failure",
      severity: "medium",
      message: "Multiple authentication failures from IP 10.0.0.50",
      ip: "10.0.0.50",
    },
    {
      id: 4,
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      type: "suspicious_agent",
      severity: "high",
      message: "Suspicious user agent detected from IP 198.51.100.99",
      ip: "198.51.100.99",
    },
  ]);

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor(
      (Date.now() - new Date(timestamp).getTime()) / 1000
    );

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "warning":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleUnblockIP = (ip: string) => {
    console.log(`Unblocking IP: ${ip}`);
    setBlockedIPs(blockedIPs.filter((item) => item.ip !== ip));
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Security Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitor security events, rate limiting, and blocked IPs
            </p>
          </div>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Requests (24h)
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.totalRequests.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                +12% from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Blocked Requests
              </CardTitle>
              <Ban className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.blockedRequests}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((metrics.blockedRequests / metrics.totalRequests) * 100).toFixed(
                  2
                )}
                % of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Rate Limit Hits
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.rateLimit429s}</div>
              <p className="text-xs text-muted-foreground mt-1">
                429 status codes returned
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Blocked IPs
              </CardTitle>
              <Ban className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.blockedIPs}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Permanently blocked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Suspicious IPs
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.suspiciousIPs}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Being monitored
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Auth Failures
              </CardTitle>
              <Shield className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.authFailures}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Failed login attempts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="events" className="space-y-4">
          <TabsList>
            <TabsTrigger value="events">Security Events</TabsTrigger>
            <TabsTrigger value="suspicious">Suspicious IPs</TabsTrigger>
            <TabsTrigger value="blocked">Blocked IPs</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Security Events</CardTitle>
                <CardDescription>
                  Real-time security events and alerts from the past 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {securityEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between border-b pb-4 last:border-0"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(event.severity) as any}>
                            {event.severity}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTimeAgo(event.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{event.message}</p>
                        <p className="text-xs text-muted-foreground">
                          IP: {event.ip} • Type: {event.type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suspicious" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Suspicious IP Addresses</CardTitle>
                <CardDescription>
                  IPs with unusual behavior being monitored for violations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suspiciousIPs.map((ipInfo) => (
                    <div
                      key={ipInfo.ip}
                      className="flex items-center justify-between border-b pb-4 last:border-0"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-mono font-medium">
                          {ipInfo.ip}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ipInfo.violations} violations • Last seen{" "}
                          {formatTimeAgo(ipInfo.lastSeen)}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Monitoring
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blocked" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Blocked IP Addresses</CardTitle>
                <CardDescription>
                  IPs that have been permanently blocked due to security
                  violations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {blockedIPs.map((ipInfo) => (
                    <div
                      key={ipInfo.ip}
                      className="flex items-center justify-between border-b pb-4 last:border-0"
                    >
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-mono font-medium">
                          {ipInfo.ip}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ipInfo.violations} violations • Blocked{" "}
                          {formatTimeAgo(ipInfo.lastSeen)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">
                          <Ban className="h-3 w-3 mr-1" />
                          Blocked
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnblockIP(ipInfo.ip)}
                        >
                          Unblock
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Rate Limiting Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Rate Limiting Configuration</CardTitle>
            <CardDescription>
              Current rate limiting rules applied to API endpoints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">General API</p>
                  <p className="text-xs text-muted-foreground">
                    /api/* endpoints
                  </p>
                </div>
                <Badge variant="outline">100 req / 15 min</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Authentication</p>
                  <p className="text-xs text-muted-foreground">
                    /api/auth/* endpoints
                  </p>
                </div>
                <Badge variant="outline">5 req / 15 min</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Email Sending</p>
                  <p className="text-xs text-muted-foreground">
                    Email delivery endpoints
                  </p>
                </div>
                <Badge variant="outline">10 req / 1 hour</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">File Uploads</p>
                  <p className="text-xs text-muted-foreground">
                    Upload endpoints
                  </p>
                </div>
                <Badge variant="outline">20 req / 1 hour</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
