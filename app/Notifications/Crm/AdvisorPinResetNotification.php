<?php

namespace App\Notifications\Crm;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AdvisorPinResetNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly string $token) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = url(route('crm.reset-pin', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], false));

        return (new MailMessage)
            ->subject('Restablece tu PIN de acceso al CRM')
            ->greeting('Hola'.($notifiable->name ? ' '.$notifiable->name : '').',')
            ->line('Recibimos una solicitud para restablecer el PIN de tu cuenta en el CRM.')
            ->action('Establecer nuevo PIN', $url)
            ->line('Este enlace vence en 60 minutos.')
            ->line('Si tú no solicitaste este cambio, puedes ignorar este mensaje.');
    }
}
