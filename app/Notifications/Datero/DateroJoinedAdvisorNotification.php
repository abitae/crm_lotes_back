<?php

namespace App\Notifications\Datero;

use App\Models\Inmopro\Datero;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DateroJoinedAdvisorNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private Datero $datero) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Nuevo datero registrado')
            ->greeting('Hola '.$notifiable->name)
            ->line('Un nuevo datero se registró con Google y eligió trabajar contigo.')
            ->line('Nombre: '.$this->datero->name)
            ->line('Correo: '.$this->datero->email)
            ->line('DNI: '.$this->datero->dni)
            ->line('Teléfono: '.$this->datero->phone);
    }
}
