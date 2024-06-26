"use client";

import socketClient from "@/configs/socket/client";
import { useCallback, useContext, useEffect, useState } from "react";
import { PageContext } from "../layout";
import { RideRequestStatus, User } from "@prisma/client";
import { getRideRequest } from "@/app/api/ride/request/queries";
import { useToast } from "@/lib/shadcn/components/ui/use-toast";
import { useRideRequest } from "@/hooks/useRideRequest";
import { LocationEventDetailed, RideRequest } from "@/sharedTypes";
import { useMap } from "@/hooks/useMap";
import { Map } from "@/components/map";
import { RideRequestCard } from "./components/rideRequestCard";
import { NoRequestsCard } from "./components/noRequestsCard";

export default function Driver() {
  const {
    locationSource,
    locationDestination,
    directionRoutePoints,
    isGoogleMapsLoaded,
    setLocationSource,
    setLocationDestination,
    setDirectionRoutePoints,
    handleSetDirectionRoute,
  } = useMap();
  const { user: userDriver, currentUserPosition } = useContext(PageContext);
  const { isLoading: isMutatingRideRequest, updateRideRequest } =
    useRideRequest();
  const [isAcceptingRide, setIsAcceptingRide] = useState(false);
  const [isCancelingRide, setIsCancelingRide] = useState(false);
  const [currentRideRequest, setCurrentRideRequest] =
    useState<RideRequest | null>(null);
  const [currentRider, setCurrentRider] = useState<User | null>(null);
  const { toast } = useToast();

  const resetRideStates = () => {
    setCurrentRideRequest(null);
    setCurrentRider(null);
    setLocationSource(null);
    setLocationDestination(null);
    setDirectionRoutePoints(null);
  };

  const handleNewRideRequest = useCallback(
    async (id: number) => {
      const { rideRequest, rider } = await getRideRequest(id);
      if (rideRequest) {
        toast({
          title: "New ride request",
          description: "There's a new ride request",
        });
        setCurrentRideRequest(rideRequest);
        setCurrentRider(rider);
        setLocationSource(
          rideRequest.source as unknown as LocationEventDetailed
        );
        setLocationDestination(
          rideRequest.destination as unknown as LocationEventDetailed
        );
        handleSetDirectionRoute();
      }
    },
    [handleSetDirectionRoute, setLocationDestination, setLocationSource, toast]
  );

  const handleIgnoreRideRequest = async () => {
    resetRideStates();
  };

  const handleAcceptRideRequest = async () => {
    if (!currentRideRequest) {
      return;
    }

    setIsAcceptingRide(true);

    const { rideRequest } = await updateRideRequest({
      id: currentRideRequest.id,
      body: { status: RideRequestStatus.ACCEPTED, driverId: userDriver?.id! },
    });

    if (rideRequest) {
      setCurrentRideRequest(rideRequest);
      setIsAcceptingRide(false);
      socketClient.emit("toRider_rideAccepted", userDriver?.id!);
    }
  };

  const handleCancelAcceptedRide = async () => {
    setIsCancelingRide(true);

    const { rideRequest } = await updateRideRequest({
      id: currentRideRequest?.id!,
      body: { status: RideRequestStatus.CANCELED },
    });

    if (rideRequest) {
      resetRideStates();
      setIsCancelingRide(false);
      socketClient.emit("toRider_rideCanceledByDriver");
    }
  };

  const handleRideRequestCanceledByRider = useCallback(() => {
    if (currentRideRequest) {
      return;
    }
    toast({
      title: "Ride request canceled",
      description: "The ride was canceled by rider",
    });
    resetRideStates();
  }, [currentRideRequest, toast]);

  useEffect(() => {
    socketClient.on("toDriver_newRideRequest", async (id: number) => {
      /** Should not see other ride requests if there's another active */
      if (!currentRideRequest) {
        handleNewRideRequest(id);
      }
    });
    socketClient.on("toDriver_rideCanceled", async () => {
      handleRideRequestCanceledByRider();
    });
  }, []);

  useEffect(() => {
    if (currentUserPosition && !currentRideRequest) {
      setLocationSource(currentUserPosition);
    }
  }, [currentRideRequest, currentUserPosition, setLocationSource]);

  return (
    <div className="h-full flex justify-center gap-4">
      <section>
        {currentRideRequest && currentRider ? (
          <RideRequestCard
            currentRideRequest={currentRideRequest}
            currentRider={currentRider}
            isLoading={
              isAcceptingRide || isCancelingRide || isMutatingRideRequest
            }
            onAcceptRideRequest={handleAcceptRideRequest}
            onCancelAcceptedRideRequest={handleCancelAcceptedRide}
            onIgnoreRideRequest={handleIgnoreRideRequest}
          />
        ) : (
          <NoRequestsCard />
        )}
      </section>
      <section className="flex-1 h-full bg-zinc-200 rounded-md">
        <Map
          isMapLoaded={isGoogleMapsLoaded}
          locationSource={locationSource}
          locationDestination={locationDestination}
          directionRoutePoints={directionRoutePoints}
          onSetDirectionRoute={handleSetDirectionRoute}
        />
      </section>
    </div>
  );
}
