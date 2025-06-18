"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import QRCode from "react-qr-code";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  useWriteContract,
  useReadContract,
  useConfig,
  useAccount,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { waitForTransactionReceipt, readContract } from "@wagmi/core";
import toast from "react-hot-toast";
import { parseEther } from "ethers";
import { USDC_CONTRACT_ABI } from "./abis/USDC";

import { getName } from "@coinbase/onchainkit/identity";
import { base } from "viem/chains";
import Link from "next/link";
import { RiExternalLinkLine } from "react-icons/ri";
import { IoCloseSharp } from "react-icons/io5";
import { formatWallet } from "@/utils/formatWallet";
import { AUCTION_CONTRACT_ABI } from "./abis/Auction";
import LinkPreviewServer from "@/components/LinkPreviewServer";
import MicrolinkPreview from "@/components/MicrolinkPreview";

export default function Home() {
  const reservePrice = 1000000;

  const minBidIncrement = 10;

  const { switchChainAsync } = useSwitchChain();
  const chain = useChainId();

  const [url, setUrl] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [name, setName] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [highestBid, setHighestBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState("");

  const [showModal, setShowModal] = useState(false);

  const config = useConfig();

  const { address } = useAccount();

  const contractAddress = "0x185de145BC53057CF0730EF8a53b7bEb7677Fa06";
  const TOKEN_CONTRACT_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

  const { writeContractAsync } = useWriteContract();

  const { data: auctionTokenId } = useReadContract({
    address: contractAddress,
    abi: AUCTION_CONTRACT_ABI,
    functionName: "auctionTokenId",
    query: {
      initialData: 0,
    },
  });

  const getAuctionHighestBid = useReadContract({
    address: contractAddress,
    abi: AUCTION_CONTRACT_ABI,
    functionName: "auctionHighestBid",
    query: {
      refetchInterval: 6000,
    },
  });

  useEffect(() => {
    if (getAuctionHighestBid.data !== undefined) {
      setHighestBid(Number(getAuctionHighestBid.data));
    }
  }, [getAuctionHighestBid.data]);

  const getAuctionHighestBidder = useReadContract({
    address: contractAddress,
    abi: AUCTION_CONTRACT_ABI,
    functionName: "auctionHighestBidder",
    query: {
      refetchInterval: 6000,
    },
  });

  useEffect(() => {
    if (getAuctionHighestBidder.data !== undefined) {
      setHighestBidder(String(getAuctionHighestBidder.data));
    }
  }, [getAuctionHighestBidder.data]);

  const getAuctionEndTime = useReadContract({
    address: contractAddress,
    abi: AUCTION_CONTRACT_ABI,
    functionName: "auctionEndTime",
  });

  const getCurrentQrUrl: any = useReadContract({
    address: contractAddress,
    abi: AUCTION_CONTRACT_ABI,
    functionName: "auctionQrMetadata",
    query: {
      refetchInterval: 6000,
    },
  });

  useEffect(() => {
    if (getCurrentQrUrl.data !== undefined) {
      setCurrentUrl(String(getCurrentQrUrl.data[1]));
    }
  }, [getCurrentQrUrl.data]);

  useEffect(() => {
    const fetchAuctionData = async () => {
      try {
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
    const interval = setInterval(fetchAuctionData, 1000); // Atualizar a cada 15 segundos

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchEns = async () => {
      try {
        if (!address) return;
        const ens = await getName({
          address: address as `0x${string}`,
          chain: base,
        });
        setName(ens?.toString() ?? address);
      } catch (error) {
        console.error("Error fetching ENS name:", error);
      }
    };

    if (address) {
      fetchEns();
    }
  }, [address, getName]);

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

    setTimeLeft(
      `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    );
  };

  // Função para enviar um lance
  const createBid = async () => {
    try {
      if (chain !== base.id) {
        if (switchChainAsync) {
          await switchChainAsync({
            chainId: base.id,
          });
        } else {
          return toast.error("Please switch to the Base network.");
        }
      }

      const numericBid = parseFloat(bidAmount);

      const allowance = await readContract(config, {
        address: TOKEN_CONTRACT_ADDRESS,
        abi: USDC_CONTRACT_ABI,
        args: [address, contractAddress],
        functionName: "allowance",
      });

      console.log(Number(allowance) / 10 ** 6, numericBid);

      if (Number(allowance) / 10 ** 6 < numericBid) {
        toast.loading("Sending...");

        const balanceOf = await readContract(config, {
          address: TOKEN_CONTRACT_ADDRESS,
          abi: USDC_CONTRACT_ABI,
          args: [address],
          functionName: "balanceOf",
        });

        console.log(balanceOf);

        const data = await writeContractAsync({
          address: TOKEN_CONTRACT_ADDRESS,
          abi: USDC_CONTRACT_ABI,
          functionName: "increaseAllowance",
          args: [contractAddress, parseEther(String(balanceOf))],
        });

        await waitForTransactionReceipt(config, { hash: data });
        toast.dismiss();
        toast.success("Allowance updated");
        await Promise.all([
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      }

      // Verificar se o lance atende aos requisitos mínimos
      if (isNaN(numericBid) || numericBid <= 0) {
        toast.error("Please enter a valid bid amount");
        return;
      }

      // Converter para base 6 (USDC tem 6 decimais)
      const bidAmountInBase6 = Math.floor(numericBid * 10 ** 6);

      // Se não há lance anterior, verificar se atende ao preço de reserva
      if (highestBid === 0 && bidAmountInBase6 < reservePrice) {
        toast.error(
          `Bid must be at least ${reservePrice / 10 ** 6} USDC (min bid)`
        );
        return;
      }

      // Se há lance anterior, verificar incremento mínimo
      if (highestBid > 0) {
        const minBid = highestBid + (highestBid * minBidIncrement) / 100;
        if (bidAmountInBase6 < minBid) {
          toast.error(
            `Bid must be at least ${
              minBid / 10 ** 6
            } USDC (${minBidIncrement}% increment)`
          );
          return;
        }
      }

      // Chamar a função do contrato com o valor em base 6
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: AUCTION_CONTRACT_ABI,
        functionName: "createBid",
        args: [auctionTokenId, url, name, bidAmountInBase6], // Valor convertido para base 6
      });

      // Esperar pela confirmação da transação
      const receipt = await waitForTransactionReceipt(config, { hash });
      if (receipt.status === "success") {
        toast.success("Bid placed successfully!");
        // Atualizar os dados após o lance
        const bid = await getAuctionHighestBid.refetch();
        if (bid.data) setHighestBid(Number(bid.data));
        const bidder: any = await getAuctionHighestBidder.refetch();
        if (bidder.data) setHighestBidder(bidder.data);
        const qrData: any = await getCurrentQrUrl.refetch();
        if (qrData.data) setCurrentUrl(qrData.data[1]);
      } else {
        toast.error("Bid failed");
      }
    } catch (error) {
      console.error("Error placing bid:", error);
      toast.error(
        `Bid failed: ${error instanceof Error ? error.message : String(error)}`
      );
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
    <div className="bg-[url('/bg.png')] bg-cover bg-center min-h-screen py-5">
      <nav className="flex w-full justify-between items-center p-4">
        <Image src="/logo.png" width={100} height={100} alt="logo" />
        <ConnectButton showBalance={false} />
      </nav>

      <main className="mx-auto px-4  max-w-md">
        <div className="flex items-center justify-center text-2xl border-2 border-[#FCD949] text-[#FCD949]  rounded-full w-12 h-12 mb-2 justify-self-center">
          <span>{String(auctionTokenId)}</span>
        </div>
        <div className="relative">
          <Image src="/label.png" width={768} height={200} alt="Live Auction" />
          <span className="absolute inset-0 flex items-center justify-center text-[#D38D17] font-bold">
            Live Auction (ends in {timeLeft || "00:00:00"})
          </span>
        </div>

        <div className="flex justify-center gap-6 mt-8">
          {/* Coin display dinâmico */}
          <div className="relative h-44 w-44">
            <Image src="/coin.png" fill alt="coin" className="object-contain" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[#D38D17] font-bold">
              <span className="text-3xl">{highestBid / 1000000 || 0}</span>
              <span className="text-xl">USDC</span>
            </div>
          </div>

          {/* QR Frame com QRCode dinâmico */}
          <div className="relative h-52 w-50">
            {/* <Image
              src="/qrFrame.png"
              fill
              alt="QR Frame"
              className="object-contain"
            /> */}
            {currentUrl && (
              <div className=" flex items-center justify-center border-8 border-[#F9D843] rounded-lg mt-5">
                {/* <QRCode bgColor="#F9D843" value={currentUrl} size={110} /> */}
                <MicrolinkPreview url={currentUrl} />
              </div>
            )}
          </div>
        </div>

        <span className=" inset-0 flex items-center justify-center text-[#D38D17] font-bold mt-5">
          Highest Bidder: {formatWallet(highestBidder)}
        </span>

        <div className="flex">
          {/* Exibição dinâmica da URL */}
          <Link
            href={currentUrl}
            target="_blank"
            className="cursor-pointer flex items-center justify-center gap-5 mt-10 w-full max-w-xs mx-auto border-2 border-[#BA700A] bg-[#D38D17] text-[#2C1100] font-bold py-3 px-2 rounded-full text-center truncate"
          >
            {currentUrl || "No active URL"}
            {currentUrl && <RiExternalLinkLine size={25} />}
          </Link>
          <button
            onClick={() => setShowModal(!showModal)}
            className="cursor-pointer w-20 flex items-center justify-center gap-5 mt-10 max-w-xs mx-auto border-2 border-[#BA700A] bg-[#D38D17] text-[#2C1100] font-bold py-3 px-2 rounded-full text-center truncate"
          >
            Bids
          </button>
        </div>

        {/* Formulário de inputs e submit */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          <input
            type="number"
            placeholder={
              highestBid > 0
                ? `Min bid: ${
                    (highestBid + (highestBid * minBidIncrement) / 100) /
                    10 ** 6
                  } USDC`
                : `Min bid: ${reservePrice / 10 ** 6} USDC`
            }
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            className="w-full block border-2 border-[#BA700A] bg-[#D38D17] text-[#2C1100] placeholder-[#2C1100] font-bold py-3 px-2 rounded-full"
            required
            min={
              highestBid > 0
                ? (highestBid + (highestBid * minBidIncrement) / 100) / 10 ** 6
                : reservePrice / 10 ** 6
            }
            step="0.000001"
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
            className="cursor-pointer w-full block max-w-xs mx-auto bg-[#b03f0a] text-[#de9b26] font-bold text-2xl py-3 px-2 rounded-full transition-colors duration-200 ease-in-out hover:bg-[#de9b26] hover:text-[#b03f0a]"
          >
            Submit Bid
          </button>
        </form>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="relative w-[90%] max-w-md">
            {/* Imagem do modal */}
            <Image
              src="/modal.png" // nomeie assim o arquivo exportado para o diretório public/
              width={768}
              height={1152}
              alt="Pergaminho Modal"
              className="w-full h-auto object-cover rounded-xl"
            />

            {/* Conteúdo acima da imagem */}
            <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-start p-8 text-yellow-300 font-bold">
              <div className="flex items-center justify-between w-full px-10 mt-2">
                <h2 className="text-3xl m-4">Bids</h2>
                <IoCloseSharp
                  onClick={() => setShowModal(false)}
                  size={30}
                  className="cursor-pointer"
                />
              </div>
              <div className="space-y-3 mt-5"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
