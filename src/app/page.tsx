"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import QRCode from "react-qr-code";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useWriteContract, useReadContract, useConfig } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";

export default function Home() {
  const [url, setUrl] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [name, setName] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [highestBid, setHighestBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState("");
  const [reservePrice, setReservePrice] = useState(0);
  const [minBidIncrement, setMinBidIncrement] = useState(0);

  const config = useConfig()

  const contractAddress = "0x185de145BC53057CF0730EF8a53b7bEb7677Fa06" 
  
  const contractABI = [
    {
      "inputs": [
        {"internalType": "uint256", "name": "_tokenId", "type": "uint256"},
        {"internalType": "string", "name": "_urlString", "type": "string"},
        {"internalType": "string", "name": "_name", "type": "string"},
        {"internalType": "uint256", "name": "_bidAmount", "type": "uint256"},

      ],
      "name": "createBid",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "auctionHighestBid",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "auctionHighestBidder",
      "outputs": [{"internalType": "address", "name": "", "type": "address"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "reservePrice",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "minBidIncrement",
      "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "auctionEndTime",
      "outputs": [{"internalType": "uint40", "name": "", "type": "uint40"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "auctionQrMetadata",
      "outputs": [
        {"internalType": "uint256", "name": "validUntil", "type": "uint256"},
        {"internalType": "string", "name": "urlString", "type": "string"}
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  const { writeContractAsync } = useWriteContract();

  const getAuctionHighestBid = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: "auctionHighestBid",
  });

  const getAuctionHighestBidder = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: "auctionHighestBidder",
  });

  const getReservePrice = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: "reservePrice",
  });

  const getMinBidIncrement = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: "minBidIncrement",
  });

  const getAuctionEndTime = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: "auctionEndTime",
  });

  const getCurrentQrUrl = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: "auctionQrMetadata",
  });

  useEffect(() => {
    const fetchAuctionData = async () => {
      try {
        // Atualizar maior lance
        const bid = await getAuctionHighestBid.refetch();
        if (bid.data) setHighestBid(Number(bid.data));

        // Atualizar maior licitante
        const bidder: any = await getAuctionHighestBidder.refetch();
        if (bidder.data) setHighestBidder(bidder.data);

        // Atualizar preço de reserva
        const reserve = await getReservePrice.refetch();
        if (reserve.data) setReservePrice(Number(reserve.data));

        // Atualizar incremento mínimo
        const increment = await getMinBidIncrement.refetch();
        if (increment.data) setMinBidIncrement(Number(increment.data));

        // Atualizar URL do QR code
        const qrData: any = await getCurrentQrUrl.refetch();
        if (qrData.data && qrData.data.urlString !== "0x") {
          setCurrentUrl(qrData.data.urlString);
        }

        // Atualizar contagem regressiva
        const endTime = await getAuctionEndTime.refetch();
        if (endTime.data) {
          updateCountdown(Number(endTime.data) * 1000);
        }
      } catch (error) {
        console.error("Error fetching auction data:", error);
      }
    };

    fetchAuctionData();
    const interval = setInterval(fetchAuctionData, 15000); // Atualizar a cada 15 segundos

    return () => clearInterval(interval);
  }, []);

  // Função para calcular e atualizar a contagem regressiva
  const updateCountdown = (endTime: number) => {
    const now = Date.now();
    if (endTime <= now) {
      setTimeLeft("Auction ended");
      return;
    }

    const diff = endTime - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  };

  // Função para enviar um lance
  const createBid = async () => {
    try {
      // Verificar se o lance atende aos requisitos mínimos
      const numericBid = parseFloat(bidAmount);
      if (isNaN(numericBid) || numericBid <= 0) {
        alert("Please enter a valid bid amount");
        return;
      }

      // Se não há lance anterior, verificar se atende ao preço de reserva
      if (highestBid === 0 && numericBid < reservePrice) {
        alert(`Bid must be at least ${reservePrice} USDC (reserve price)`);
        return;
      }

      // Se há lance anterior, verificar incremento mínimo
      if (highestBid > 0) {
        const minBid = highestBid + (highestBid * minBidIncrement / 100);
        if (numericBid < minBid) {
          alert(`Bid must be at least ${minBid} USDC (${minBidIncrement}% increment)`);
          return;
        }
      }

      // Chamar a função do contrato
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: contractABI,
        functionName: "createBid",
        args: [1, url, name, numericBid], // Assumindo tokenId = 1
      });

      // Esperar pela confirmação da transação
      const receipt = await waitForTransactionReceipt(config, { hash });
      if (receipt.status === "success") {
        alert("Bid placed successfully!");
        // Atualizar os dados após o lance
        const bid = await getAuctionHighestBid.refetch();
        if (bid.data) setHighestBid(Number(bid.data));
        const bidder: any = await getAuctionHighestBidder.refetch();
        if (bidder.data) setHighestBidder(bidder.data);
        const qrData: any = await getCurrentQrUrl.refetch();
        if (qrData.data) setCurrentUrl(qrData.data.urlString);
      } else {
        alert("Bid failed");
      }
    } catch (error) {
      console.error("Error placing bid:", error);
      alert(`Bid failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !bidAmount || !name) {
      alert("Please fill all fields");
      return;
    }
    await createBid();
  };

  return (
    <div className="bg-[url('/bg.png')] bg-cover bg-center min-h-screen">
      <nav className="flex w-full justify-between items-center p-4">
        <Image src="/logo.png" width={80} height={80} alt="logo" />
        <ConnectButton showBalance={false} />
      </nav>

      <main className="mx-auto px-4  max-w-md">
        <div className="relative">
          <Image src="/label.png" width={768} height={200} alt="Live Auction" />
          <span className="absolute inset-0 flex items-center justify-center text-[#D38D17] font-bold">
            Live Auction (ends in {timeLeft || "00:00:00"})
          </span>
        </div>

        <div className="flex justify-center gap-6 mt-8">
          {/* Coin display dinâmico */}
          <div className="relative h-36 w-36">
            <Image src="/coin.png" fill alt="coin" className="object-contain" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[#D38D17] font-bold">
              <span className="text-3xl">{highestBid || 0}</span>
              <span className="text-xl">USDC</span>
            </div>
          </div>

          {/* QR Frame com QRCode dinâmico */}
          <div className="relative h-52 w-52">
            <Image
              src="/qrFrame.png"
              fill
              alt="QR Frame"
              className="object-contain"
            />
            {currentUrl && (
              <div className="absolute inset-0 flex items-center justify-center p-3">
                <QRCode value={currentUrl} size={110} />
              </div>
            )}
          </div>
        </div>

        {/* Exibição dinâmica da URL */}
        <div className="mt-10 w-full max-w-xs mx-auto border-2 border-[#BA700A] bg-[#D38D17] text-[#2C1100] font-bold py-3 px-2 rounded-full text-center truncate">
          {currentUrl || "No active URL"}
        </div>

        {/* Formulário de inputs e submit */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          <input
            type="number"
            placeholder="USDC Bid Amount"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            className="w-full block border-2 border-[#BA700A] bg-[#D38D17] text-[#2C1100] placeholder-[#2C1100] font-bold py-3 px-2 rounded-full"
            required
            min={highestBid > 0 ? highestBid + (highestBid * minBidIncrement / 100) : reservePrice}
            step="any"
          />
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full block border-2 border-[#BA700A] bg-[#D38D17] text-[#2C1100] placeholder-[#2C1100] font-bold py-3 px-2 rounded-full"
            required
          />
          <input
            type="url"
            placeholder="Your URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full block border-2 border-[#BA700A] bg-[#D38D17] text-[#2C1100] placeholder-[#2C1100] font-bold py-3 px-2 rounded-full"
            required
          />
          <button
            type="submit"
            className="w-full block max-w-xs mx-auto bg-[#862A00] text-[#D38D17] font-bold text-2xl py-3 px-2 rounded-full"
          >
            Submit Bid
          </button>
        </form>
      </main>
    </div>
  );
}