"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/providers/wallet-provider";
import { toast } from "sonner";

interface OrderEntry {
  account: string;
  infx_amount: string;
  rlusd_amount: string;
  price: string;
  sequence: number;
}

export function OrderBook() {
  const { address, connected } = useWallet();
  const [asks, setAsks] = useState<OrderEntry[]>([]);
  const [bids, setBids] = useState<OrderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [sellInfx, setSellInfx] = useState("");
  const [sellRlusd, setSellRlusd] = useState("");
  const [buyInfx, setBuyInfx] = useState("");
  const [buyRlusd, setBuyRlusd] = useState("");

  const fetchOrderBook = async () => {
    try {
      const res = await fetch("/api/marketplace");
      if (res.ok) {
        const data = await res.json();
        setAsks(data.asks || []);
        setBids(data.bids || []);
      }
    } catch (err) {
      console.error("Failed to fetch order book:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderBook();
    const interval = setInterval(fetchOrderBook, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateSellOffer = async () => {
    if (!sellInfx || !sellRlusd) {
      toast.error("Enter both IFX and RLUSD amounts");
      return;
    }

    toast.info(
      `To create this sell offer, submit an OfferCreate transaction from your wallet:\n\nTakerGets: ${sellInfx} IFX\nTakerPays: ${sellRlusd} RLUSD`
    );
  };

  const handleCreateBuyOffer = async () => {
    if (!buyInfx || !buyRlusd) {
      toast.error("Enter both IFX and RLUSD amounts");
      return;
    }

    toast.info(
      `To create this buy offer, submit an OfferCreate transaction from your wallet:\n\nTakerGets: ${buyRlusd} RLUSD\nTakerPays: ${buyInfx} IFX`
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Sell Orders
              <Badge variant="destructive" className="text-xs">
                Asks
              </Badge>
            </CardTitle>
            <CardDescription>
              Users selling IFX credits for RLUSD
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Loading order book...
              </p>
            ) : asks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No sell orders yet. Be the first to list!
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Price</TableHead>
                    <TableHead>IFX</TableHead>
                    <TableHead>RLUSD</TableHead>
                    <TableHead>Seller</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asks.map((ask, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-red-500">
                        ${parseFloat(ask.price).toFixed(4)}
                      </TableCell>
                      <TableCell>{parseFloat(ask.infx_amount).toLocaleString()}</TableCell>
                      <TableCell>${parseFloat(ask.rlusd_amount).toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {ask.account.slice(0, 6)}...{ask.account.slice(-4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Buy Orders
              <Badge className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                Bids
              </Badge>
            </CardTitle>
            <CardDescription>
              Users wanting to buy IFX credits with RLUSD
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Loading order book...
              </p>
            ) : bids.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No buy orders yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Price</TableHead>
                    <TableHead>IFX</TableHead>
                    <TableHead>RLUSD</TableHead>
                    <TableHead>Buyer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bids.map((bid, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-green-500">
                        ${parseFloat(bid.price).toFixed(4)}
                      </TableCell>
                      <TableCell>{parseFloat(bid.infx_amount).toLocaleString()}</TableCell>
                      <TableCell>${parseFloat(bid.rlusd_amount).toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {bid.account.slice(0, 6)}...{bid.account.slice(-4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {connected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Order</CardTitle>
            <CardDescription>
              Place a buy or sell order on the XRPL DEX for IFX/RLUSD
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="sell">
              <TabsList className="w-full">
                <TabsTrigger value="sell" className="flex-1">
                  Sell IFX
                </TabsTrigger>
                <TabsTrigger value="buy" className="flex-1">
                  Buy IFX
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sell" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>IFX to sell</Label>
                    <Input
                      type="number"
                      placeholder="1000"
                      value={sellInfx}
                      onChange={(e) => setSellInfx(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>RLUSD asking price</Label>
                    <Input
                      type="number"
                      placeholder="8.00"
                      value={sellRlusd}
                      onChange={(e) => setSellRlusd(e.target.value)}
                    />
                  </div>
                </div>
                {sellInfx && sellRlusd && (
                  <p className="text-sm text-muted-foreground">
                    Price per credit: $
                    {(parseFloat(sellRlusd) / parseFloat(sellInfx)).toFixed(4)}{" "}
                    (face value: $0.0100)
                    {parseFloat(sellRlusd) / parseFloat(sellInfx) < 0.01 && (
                      <Badge variant="secondary" className="ml-2 text-green-500">
                        {(
                          (1 -
                            parseFloat(sellRlusd) /
                              parseFloat(sellInfx) /
                              0.01) *
                          100
                        ).toFixed(0)}
                        % discount
                      </Badge>
                    )}
                  </p>
                )}
                <Button className="w-full" onClick={handleCreateSellOffer}>
                  Create Sell Order
                </Button>
              </TabsContent>

              <TabsContent value="buy" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>IFX to buy</Label>
                    <Input
                      type="number"
                      placeholder="1000"
                      value={buyInfx}
                      onChange={(e) => setBuyInfx(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>RLUSD to offer</Label>
                    <Input
                      type="number"
                      placeholder="8.00"
                      value={buyRlusd}
                      onChange={(e) => setBuyRlusd(e.target.value)}
                    />
                  </div>
                </div>
                {buyInfx && buyRlusd && (
                  <p className="text-sm text-muted-foreground">
                    Price per credit: $
                    {(parseFloat(buyRlusd) / parseFloat(buyInfx)).toFixed(4)}{" "}
                    (face value: $0.0100)
                  </p>
                )}
                <Button className="w-full" onClick={handleCreateBuyOffer}>
                  Create Buy Order
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
